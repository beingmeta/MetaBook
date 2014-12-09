/* -*- Mode: Javascript; Character-encoding: utf-8; -*- */

/* Copyright (C) 2014 beingmeta, inc.
   Web font preloader for metaBook
*/

if (typeof WebFontConfig === "undefined") {
    WebFontConfig={
	custom: {
	    families: ["Open Sans","Open Dyslexic"],
	    urls: ["{{bmstatic}}fonts/open_sans.css",
		   "{{bmstatic}}fonts/open_dyslexic.css"]}};
    (function() {
	var wf = document.createElement('script');
	wf.src = "{{bmstatic}}fonts/loader/webfontloader.js";
	wf.type = 'text/javascript';
	wf.async = 'true';
	var s = document.getElementsByTagName('script')[0];
	s.parentNode.insertBefore(wf, s);
    })();}
