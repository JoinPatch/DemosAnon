// src/components/ASCIIHeader.jsx
import React from 'react';

const demosLogoText = [
  "XMMMMMMMKo,     XMMMMMMMMMMM0   XMM      MMc    .dMMMMMMMb.      dMMMMMMMM0. ",
  "XMM;     XMW    XMMl            XMMM    MMMc   .0MM     MM0;.   KMM         ",
  "xMM;      MMc   XMMl            XMM WMMM MMc   o0M       MM0o   KMM         ",
  "XMM;      MMC   XMMMMMMMMM0     XMM  WW  MMc   W0Ml      .M0W    dMMMMMMMb. ",
  "XMM;      MMc   XMMl            XMM      MMc   o0M;      ;M0o            MM0",
  "XMM;     oMd    XMMl            XMM      MMc   .0MM      MM0.            MM0",
  "XMMMMMMMMKP'    XMMMMMMMMMMM0   XMM      MMc    ';MMMMMMM:'     .0MMMMMMMm' ",
];

export default function ASCIIHeader(){
  return (
    <pre className="ascii-art" aria-label="DEMOS logo">
      {demosLogoText.join('\n')}
    </pre>
  );
}