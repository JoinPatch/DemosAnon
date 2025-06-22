#!/usr/bin/env python3
"""
ASCII Art Generator for "DEMOS"
Creates monospace ASCII art similar to the Jules style
"""

def create_demos_ascii():
    """
    Creates ASCII art for 'DEMOS' using block characters
    Each letter is designed wider (8-10 chars) similar to Jules style
    """
    
    # Define each letter as wider patterns (similar to Jules proportions)
    # Using █ for filled blocks and spaces for empty
    letters = {
        'D': [
            "███████████ ",
            "████    ████",
            "████     ███", 
            "████     ███",
            "████     ███",
            "████    ████",
            "███████████ "
        ],
        'E': [
            "████████████",
            "████        ",
            "████        ",
            "████████████",
            "████        ",
            "████        ",
            "████████████"
        ],
        'M': [
            "████    ████",
            "█████  █████",
            "██████ █████",
            "████ ██ ████",
            "████    ████",
            "████    ████",
            "████    ████"
        ],
        'O': [
            " ██████████ ",
            "████    ████",
            "████    ████",
            "████    ████",
            "████    ████",
            "████    ████",
            " ██████████ "
        ],
        'S': [
            " ███████████",
            "████        ",
            "████        ",
            " ██████████ ",
            "        ████",
            "        ████",
            "███████████ "
        ]
    }
    
    # Create the word DEMOS
    word = "DEMOS"
    spacing = "   "  # More space between letters for wider design
    
    # Build the ASCII art line by line
    ascii_lines = []
    
    for row in range(7):
        line = ""
        for i, char in enumerate(word):
            line += letters[char][row]
            if i < len(word) - 1:  # Add spacing except after last letter
                line += spacing
        ascii_lines.append(line)
    
    return ascii_lines

def create_demos_ascii_alternative():
    """
    Alternative style using different characters like the Jules logo
    Each letter is much wider (8-12 chars) like Jules
    """
    letters = {
        'D': [
            "WMMMMMMMMM  ",
            "WMM     MMW ",
            "WMM      MMW", 
            "WMM      MMW",
            "WMM      MMW",
            "WMM     MMW ",
            "WMMMMMMMMM  "
        ],
        'E': [
            "WMMMMMMMMMMM",
            "WMM         ",
            "WMM         ",
            "WMMMMMMMMM  ",
            "WMM         ",
            "WMM         ",
            "WMMMMMMMMMMM"
        ],
        'M': [
            "WMM      MMW",
            "WMMM    MMMW",
            "WMM MMMM MMW",
            "WMM  MM  MMW",
            "WMM      MMW",
            "WMM      MMW",
            "WMM      MMW"
        ],
        'O': [
            " MMMMMMMMMM ",
            "MMM      MMM",
            "MMM      MMM",
            "MMM      MMM",
            "MMM      MMM",
            "MMM      MMM",
            " MMMMMMMMMM "
        ],
        'S': [
            " MMMMMMMMMMM",
            "MMM         ",
            "MMM         ",
            " MMMMMMMMMM ",
            "         MMM",
            "         MMM",
            "MMMMMMMMMMM "
        ]
    }
    
    word = "DEMOS"
    spacing = "   "  # More spacing for wider letters
    
    ascii_lines = []
    for row in range(7):
        line = ""
        for i, char in enumerate(word):
            line += letters[char][row]
            if i < len(word) - 1:
                line += spacing
        ascii_lines.append(line)
    
    return ascii_lines

def create_demos_ascii_jules_style():
    """
    Create ASCII art that closely matches the Jules style
    Using mixed characters and wider letters (10-12 chars each)
    """
    letters = {
        'D': [
            "XMMMMMMMMKl ",
            "XMM     MMW ",
            "XMM      MMc", 
            "XMM      MMc",
            "XMM      MMc",
            "XMM     MMW ",
            "XMMMMMMMMKl "
        ],
        'E': [
            "XMMMMMMMMMM0",
            "XMM         ",
            "XMM         ",
            "XMMMMMMMM0  ",
            "XMM         ",
            "XMM         ",
            "XMMMMMMMMMM0"
        ],
        'M': [
            "XMM      MMc",
            "XMMM    MMMc",
            "XMM WMMM MMc",
            "XMM  WW  MMc",
            "XMM      MMc",
            "XMM      MMc",
            "XMM      MMc"
        ],
        'O': [
            " 0MMMMMMMM0 ",
            "0MM      MM0",
            "0MM      MM0",
            "0MM      MM0",
            "0MM      MM0",
            "0MM      MM0",
            " 0MMMMMMMM0 "
        ],
        'S': [
            " KMMMMMMMM0 ",
            "KMM         ",
            "KMM         ",
            " KMMMMMMMK  ",
            "         MM0",
            "         MM0",
            " 0MMMMMMMMK "
        ]
    }
    
    word = "DEMOS"
    spacing = "   "  # More spacing for wider letters
    
    ascii_lines = []
    for row in range(7):
        line = ""
        for i, char in enumerate(word):
            line += letters[char][row]
            if i < len(word) - 1:
                line += spacing
        ascii_lines.append(line)
    
    return ascii_lines

def print_ascii_for_javascript(ascii_lines, title="DEMOS ASCII Art"):
    """
    Format the ASCII art for JavaScript array
    """
    print(f"\n// {title}")
    print("const demosLogoText = [")
    for line in ascii_lines:
        # Pad to 60 characters to match Jules format
        padded_line = line.ljust(60)
        print(f'    "{padded_line}",')
    print("];")
    print()

def main():
    print("ASCII Art Generator for DEMOS")
    print("=" * 40)
    
    # Generate different styles
    print("\n1. Block Style (█ characters):")
    block_style = create_demos_ascii()
    for line in block_style:
        print(f"    {line}")
    print_ascii_for_javascript(block_style, "DEMOS ASCII Art - Block Style")
    
    print("\n2. Alternative Style (M/W characters):")
    alt_style = create_demos_ascii_alternative()
    for line in alt_style:
        print(f"    {line}")
    print_ascii_for_javascript(alt_style, "DEMOS ASCII Art - Alternative Style")
    
    print("\n3. Jules Style (Mixed characters):")
    jules_style = create_demos_ascii_jules_style()
    for line in jules_style:
        print(f"    {line}")
    print_ascii_for_javascript(jules_style, "DEMOS ASCII Art - Jules Style")

if __name__ == "__main__":
    main()