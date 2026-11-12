import React, { useEffect, useState } from "react";
import ASCIIHeader from "./ASCIIHeader.jsx";

// Picks the header in the browser, so it follows today's date rather than the
// day the site was last built. Add ?christmas to the URL to see it any time.
const isChristmas = () =>
	new Date().getMonth() === 11 || new URLSearchParams(window.location.search).has("christmas");

const SeasonalHeader = () => {
	const [christmas, setChristmas] = useState(false);
	useEffect(() => setChristmas(isChristmas()), []);
	return <ASCIIHeader christmas={christmas} />;
};

export default SeasonalHeader;
