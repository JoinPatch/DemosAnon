import React, { useEffect, useState } from "react";
import NormalHeader from "./ASCIIHeader.jsx";
import HalloweenHeader from "./HalloweenHeader.jsx";

// Picks the header in the browser, so it follows today's date rather than the
// day the site was last built. Add ?halloween to the URL to see that one any time.
const isHalloween = () =>
	new Date().getMonth() === 9 || new URLSearchParams(window.location.search).has("halloween");

const SeasonalHeader = () => {
	const [halloween, setHalloween] = useState(false);
	useEffect(() => setHalloween(isHalloween()), []);
	return halloween ? <HalloweenHeader /> : <NormalHeader />;
};

export default SeasonalHeader;
