import argparse
import os
import re
import time
import urllib.parse
import mimetypes
import requests
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Optional, Tuple
from abc import ABC, abstractmethod

from bs4 import BeautifulSoup

# Selenium
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import WebDriverException
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.edge.options import Options as EdgeOptions
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.edge.service import Service as EdgeService

# --------------------------- Defaults ----------------------------------------
USE_SELENIUM: bool = True  # Notion toggles/lazy images usually need Selenium
BASE_NOTION_URL: str = (
    "https://ethereal-society-312.notion.site/"
    "Demos-Anon-d3138e1a280e4042be808cf0a926c919#16c0833ba0fa805d8052e3dde800ca27"
)
BASE_IMG_DIR: str = "sessions"        # root directory to write images
REQUEST_TIMEOUT: int = 60
SCROLL_PAUSE: float = 0.5
MAX_SCROLL_PASSES: int = 40

# --------------------------- Helpers -----------------------------------------
def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)

def session_number_from_text(text: str) -> Optional[int]:
    """Return int session number if text contains 'Session {n}'."""
    m = re.search(r"\bSession\s+(\d+)\b", text, flags=re.IGNORECASE)
    return int(m.group(1)) if m else None

def best_img_src(node) -> Optional[str]:
    """Choose the best available URL for a Notion <img>."""
    src = node.get("src") or node.get("data-src")
    if not src:
        srcset = node.get("srcset")
        if srcset:
            first = srcset.split(",")[0].strip().split(" ")[0]
            src = first
    return src

def ext_from_url_or_headers(url: str, resp: requests.Response) -> str:
    # try URL path
    parsed = urllib.parse.urlparse(url)
    ext = os.path.splitext(parsed.path)[1]
    if ext and len(ext) <= 5:
        return ext
    # try content-type
    ctype = resp.headers.get("Content-Type", "")
    if ctype:
        guess = mimetypes.guess_extension(ctype.split(";")[0].strip())
        if guess:
            return guess
    return ".jpg"

# --------------------------- Base Scraper ------------------------------------
class BaseNotionImageScraper(ABC):
    def __init__(self, notion_url: str, output_root: str):
        self.notion_url: str = notion_url
        self.output_root: Path = Path(output_root)
        ensure_dir(self.output_root)

    @abstractmethod
    def get_fully_rendered_html(self) -> str:
        """Return the full HTML of the Notion page (after expanding toggles, lazy-load, etc.)."""
        raise NotImplementedError

    @staticmethod
    def collect_images_by_session(html: str,
                                  min_session: Optional[int] = None,
                                  max_session: Optional[int] = None) -> Dict[int, List[str]]:
        soup = BeautifulSoup(html, "lxml")
        imgs: Dict[int, List[str]] = defaultdict(list)
        current_session: Optional[int] = None

        for node in soup.find_all(True):  # all tags, in document order
            txt = node.get_text(strip=True)
            if txt:
                maybe = session_number_from_text(txt)
                if maybe is not None:
                    current_session = maybe

            if node.name == "img":
                src = best_img_src(node)
                if src and current_session is not None:
                    if (min_session is None or current_session >= min_session) and \
                       (max_session is None or current_session <= max_session):
                        imgs[current_session].append(src)
        return imgs

    def download_images(self, images_by_session: Dict[int, List[str]]) -> int:
        http = requests.Session()
        http.headers.update({
            "User-Agent": "Mozilla/5.0",
            "Referer": "https://www.notion.so/"
        })
        total = 0
        for session_num in sorted(images_by_session.keys()):
            urls = images_by_session[session_num]
            if not urls:
                continue
            out_dir = self.output_root / f"session{session_num}"
            ensure_dir(out_dir)
            for i, url in enumerate(urls, start=1):
                try:
                    r = http.get(url, timeout=REQUEST_TIMEOUT, stream=True)
                    r.raise_for_status()
                    ext = ext_from_url_or_headers(url, r)
                    out_path = out_dir / f"image{i}{ext}"
                    with open(out_path, "wb") as f:
                        for chunk in r.iter_content(chunk_size=1 << 14):
                            if chunk:
                                f.write(chunk)
                    print(f"Saved: {out_path}")
                    total += 1
                except Exception as e:
                    print(f"[WARN] Failed to download {url}: {e}")
        return total

# --------------------------- Selenium Scraper --------------------------------
class SeleniumNotionImageScraper(BaseNotionImageScraper):
    """
    Uses Selenium to expand toggles, scroll, and then returns page_source.
    Prefers Chrome (to avoid EdgeDriver azureedge issues), but supports Edge.
    """

    def __init__(self,
                 notion_url: str,
                 output_root: str,
                 browser: str = "chrome",     # "chrome" or "edge"
                 headless: bool = False,
                 chrome_path: str = "",
                 chrome_driver_path: str = "",
                 edge_path: str = "",
                 edge_driver_path: str = "",
                 user_agent: str = ""):
        super().__init__(notion_url, output_root)
        self.browser = browser.lower()
        self.headless = headless
        self.chrome_path = chrome_path
        self.chrome_driver_path = chrome_driver_path
        self.edge_path = edge_path
        self.edge_driver_path = edge_driver_path
        self.user_agent = user_agent
        self.driver = self._build_driver()

    # ---- Driver provisioning strategy ----
    def _build_driver(self):
        if self.browser == "edge":
            return self._build_edge_driver()
        # default: chrome
        return self._build_chrome_driver()

    def _build_chrome_driver(self):
        options = ChromeOptions()
        if self.headless:
            options.add_argument("--headless=new")
        options.add_argument("--disable-gpu")
        options.add_argument("--no-sandbox")
        options.add_argument("--window-size=1400,2200")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-blink-features=AutomationControlled")
        if self.user_agent:
            options.add_argument(f"user-agent={self.user_agent}")
        if self.chrome_path:
            options.binary_location = self.chrome_path

        # 1) Local path wins
        if self.chrome_driver_path and Path(self.chrome_driver_path).exists():
            service = ChromeService(executable_path=self.chrome_driver_path)
            return webdriver.Chrome(service=service, options=options)

        # 2) Selenium Manager (no network to azureedge)
        try:
            service = ChromeService()  # no path => Selenium Manager resolves
            return webdriver.Chrome(service=service, options=options)
        except WebDriverException as sm_err:
            print("[INFO] Selenium Manager failed to provision ChromeDriver:", sm_err)

        # 3) Optional fallback to webdriver_manager (Google CDN; may work fine)
        try:
            from webdriver_manager.chrome import ChromeDriverManager
            driver_path = ChromeDriverManager().install()
            service = ChromeService(executable_path=driver_path)
            return webdriver.Chrome(service=service, options=options)
        except Exception as wdm_err:
            raise RuntimeError(
                "Unable to provision ChromeDriver. Provide --chrome-driver-path or install Chrome."
            ) from wdm_err

    def _build_edge_driver(self):
        options = EdgeOptions()
        if self.headless:
            options.add_argument("--headless")
        options.add_argument("--disable-gpu")
        options.add_argument("--no-sandbox")
        options.add_argument("--window-size=1400,2200")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-blink-features=AutomationControlled")
        if self.user_agent:
            options.add_argument(f"user-agent={self.user_agent}")
        if self.edge_path:
            options.binary_location = self.edge_path

        # 1) Local driver path first (avoid azureedge)
        if self.edge_driver_path and Path(self.edge_driver_path).exists():
            service = EdgeService(executable_path=self.edge_driver_path)
            return webdriver.Edge(service=service, options=options)

        # 2) Selenium Manager (may still need Microsoft endpoints)
        try:
            service = EdgeService()
            return webdriver.Edge(service=service, options=options)
        except WebDriverException as sm_err:
            print("[INFO] Selenium Manager failed to provision EdgeDriver:", sm_err)

        # 3) webdriver_manager (uses msedgedriver.azureedge.net => may fail on your network)
        try:
            from webdriver_manager.microsoft import EdgeChromiumDriverManager
            driver_path = EdgeChromiumDriverManager().install()
            service = EdgeService(executable_path=driver_path)
            return webdriver.Edge(service=service, options=options)
        except Exception as wdm_err:
            raise RuntimeError(
                "Unable to provision EdgeDriver. Pass --edge-driver-path to a local msedgedriver.exe, "
                "or switch to Chrome with --browser chrome."
            ) from wdm_err

    # ---- Helpers to render the Notion page ----
    def _expand_all_toggles(self, timeout: int = 20):
        wait = WebDriverWait(self.driver, timeout)
        wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))

        for _ in range(5):
            clicked = False

            # aria-expanded="false"
            toggles = self.driver.find_elements(By.XPATH, "//*[@aria-expanded='false']")
            for el in toggles:
                try:
                    self.driver.execute_script("arguments[0].scrollIntoView({block:'center'});", el)
                    time.sleep(0.1); el.click(); time.sleep(0.1)
                    clicked = True
                except Exception:
                    pass

            # <details><summary>
            summaries = self.driver.find_elements(By.XPATH, "//details[not(@open)]/summary")
            for el in summaries:
                try:
                    self.driver.execute_script("arguments[0].scrollIntoView({block:'center'});", el)
                    time.sleep(0.1); el.click(); time.sleep(0.1)
                    clicked = True
                except Exception:
                    pass

            # Generic toggle-ish controls
            generic = self.driver.find_elements(
                By.XPATH,
                "//*[self::button or self::div or self::span]"
                "[contains(translate(@aria-label,'TOGGLE','toggle'),'toggle') or "
                " contains(translate(@title,'TOGGLE','toggle'),'toggle')]"
            )
            for el in generic:
                try:
                    aria = el.get_attribute("aria-expanded")
                    if aria and aria.lower() == "true":
                        continue
                    self.driver.execute_script("arguments[0].scrollIntoView({block:'center'});", el)
                    time.sleep(0.1); el.click(); time.sleep(0.1)
                    clicked = True
                except Exception:
                    pass

            if not clicked:
                break

    def _slow_full_scroll(self, passes: int = MAX_SCROLL_PASSES, pause: float = SCROLL_PAUSE):
        last_height = self.driver.execute_script("return document.body.scrollHeight;")
        for _ in range(passes):
            self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(pause)
            new_height = self.driver.execute_script("return document.body.scrollHeight;")
            if new_height == last_height:
                break
            last_height = new_height
        self.driver.execute_script("window.scrollTo(0, 0);")
        time.sleep(pause)

    def get_fully_rendered_html(self) -> str:
        try:
            self.driver.get(self.notion_url)
            WebDriverWait(self.driver, 30).until(EC.presence_of_element_located((By.TAG_NAME, "body")))
            self._expand_all_toggles()
            self._slow_full_scroll()
            time.sleep(1.2)  # settle lazy-loads
            return self.driver.page_source
        finally:
            try:
                self.driver.quit()
            except Exception:
                pass

# --------------------------- CLI / Main --------------------------------------
def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Download images from a Notion page organized by 'Session {n}' headings.")
    parser.add_argument("-u", "--url", type=str, help="Notion page URL.")
    parser.add_argument("-o", "--output", type=str, help="Output root directory.", default=BASE_IMG_DIR)
    parser.add_argument("--min-session", type=int, default=None, help="Only download from sessions >= this number.")
    parser.add_argument("--max-session", type=int, default=None, help="Only download from sessions <= this number.")

    # Browser/driver options (mirroring your Substack script style)
    parser.add_argument("--browser", type=str, default="edge", choices=["chrome", "edge"], help="Browser to automate.")
    parser.add_argument("--headless", action="store_true", help="Run browser headless.")
    parser.add_argument("--chrome-path", type=str, default="", help="Path to chrome.exe (optional).")
    parser.add_argument("--chrome-driver-path", type=str, default="", help="Path to chromedriver.exe (optional).")
    parser.add_argument("--edge-path", type=str, default="", help="Path to msedge.exe (optional).")
    parser.add_argument("--edge-driver-path", type=str, default="", help="Path to msedgedriver.exe (optional).")
    parser.add_argument("--user-agent", type=str, default="", help="Custom user agent (optional).")
    return parser.parse_args()

def main():
    args = parse_args()
    notion_url = args.url or BASE_NOTION_URL

    if not USE_SELENIUM:
        raise SystemExit("This script expects Selenium to render Notion (toggles/lazy images). Set USE_SELENIUM=True.")

    scraper = SeleniumNotionImageScraper(
        notion_url=notion_url,
        output_root=args.output,
        browser=args.browser,
        headless=args.headless,
        chrome_path=args.chrome_path,
        chrome_driver_path=args.chrome_driver_path,
        edge_path=args.edge_path,
        edge_driver_path=args.edge_driver_path,
        user_agent=args.user_agent,
    )

    html = scraper.get_fully_rendered_html()
    images_by_session = BaseNotionImageScraper.collect_images_by_session(
        html, min_session=args.min_session, max_session=args.max_session
    )
    if not images_by_session:
        print("No images found. Try increasing MAX_SCROLL_PASSES or verify 'Session {n}' headings.")
        return

    total = scraper.download_images(images_by_session)
    print(f"\nDone. Saved {total} images.")

if __name__ == "__main__":
    main()