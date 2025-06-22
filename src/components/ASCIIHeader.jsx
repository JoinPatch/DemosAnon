// src/components/ASCIIHeader.jsx
import React from 'react';

const ASCIIHeader = () => {
  // Your generated ASCII art
  const demosLogoText = [
    "XMMMMMMMMKo,    XMMMMMMMMMMM0   XMM      MMc    .dMMMMMMMb.      dMMMMMMMM0. ",
    "XMM;     XMW    XMMl            XMMM    MMMc   .0MM     MM0;.   KMM         ",
    "xMM;      MMc   XMMl            XMM WMMM MMc   o0M       MM0o   KMM         ",
    "XMM;      MMC   XMMMMMMMMM0     XMM  WW  MMc   W0Ml      .M0W    dMMMMMMMb.  ",
    "XMM;      MMc   XMMl            XMM      MMc   o0M;      ;M0o            MM0",
    "XMM;     oMd    XMMl            XMM      MMc   .0MM      MM0.            MM0",
    "XMMMMMMMMKP'    XMMMMMMMMMMM0   XMM      MMc    ';MMMMMMM:'     .0MMMMMMMm' ",
  ];

  return (
    <div className="ascii-header">
      <pre className="ascii-art">
        {demosLogoText.join('\n')}
      </pre>
    </div>
  );
};

export default ASCIIHeader;