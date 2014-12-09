/* -*- Mode: Javascript; Character-encoding: utf-8; -*- */

/* ###################### metabook/core.js ###################### */

/* Copyright (C) 2009-2014 beingmeta, inc.
   This file implements a Javascript/DHTML web application for reading
   large structured documents (sBooks).

   For more information on sbooks, visit www.sbooks.net
   For more information on knodules, visit www.knodules.net
   For more information about beingmeta, visit www.beingmeta.com

   This library uses the FDJT (www.fdjt.org) toolkit.

   This program comes with absolutely NO WARRANTY, including implied
   warranties of merchantability or fitness for any particular
   purpose.

   Use and redistribution (especially embedding in other
   CC licensed content) is permitted under the terms of the
   Creative Commons "Attribution-NonCommercial" license:

   http://creativecommons.org/licenses/by-nc/3.0/ 

   Other uses may be allowed based on prior agreement with
   beingmeta, inc.  Inquiries can be addressed to:

   licensing@beingmeta.com

   Enjoy!

*/
/* jshint browser: true */

if (typeof WebFontConfig === "undefined") {
    WebFontConfig={
	custom: {
e	    families: ["Open Sans","Open Dyslexic"],
ne	    urls: ["{{bmstatic}}/fonts/opensans.css",
		   "{{bmstatic}}/fonts/opensans.css"]}};
    (function() {
	var wf = document.createElement('script');
	wf.src = "{{bmstatic}}/fonts/loader/webfontloader.js";
	wf.type = 'text/javascript';
	wf.async = 'true';
	var s = document.getElementsByTagName('script')[0];
	s.parentNode.insertBefore(wf, s);
    })();}
