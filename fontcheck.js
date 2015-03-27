/* -*- Mode: Javascript; Character-encoding: utf-8; -*- */

/* ###################### metabook/core.js ###################### */

/* Copyright (C) 2009-2015 beingmeta, inc.
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
/* globals Promise */

/* Initialize these here, even though they should always be
   initialized before hand.  This will cause various code checkers to
   not generate unbound variable warnings when called on individual
   files. */
//var fdjt=((typeof fdjt !== "undefined")?(fdjt):({}));
//var Knodule=((typeof Knodule !== "undefined")?(Knodule):({}));
//var iScroll=((typeof iScroll !== "undefined")?(iScroll):({}));
//var fdjtMap=fdjt.Map;

(function(){
    var start=(new Date()).getTime();
    var timeout_after=60*1000, check_interval=100;
    var sample_text="QW@HhsXJ.,+";
    var html=document.documentElement, body=document.body;
    var div1=document.createElement("DIV");
    var div2=document.createElement("DIV");
    var text1=document.createTextNode(sample_text);
    var text2=document.createTextNode(sample_text);
    var style1=div1.style, style2=div2.style;
    style1.position=style2.position='absolute';
    style1.top=style2.top="-5000px";
    style1.left=style2.left='-5000px';
    style1.pointerEvents=style2.pointerEvents='none';
    style1.zIndex=style2.zIndex='500';
    style1.opacity=style2.opacity=0.0;
    style1.fontSize=style2.fontSize="250px";
    style1.fontFamily="'Open Sans','Comic Sans MS'";
    style1.fontFamily="'Comic Sans MS'";
    div1.id="METABOOK_FONTCHECK1";
    div2.id="METABOOK_FONTCHECK2";
    div1.className=div2.className="_ignoreme";
    div1.appendChild(text1);
    div2.appendChild(text2);
    body.appendChild(div1);
    body.appendChild(div2);
    var itimer, timeout;
    function cleanup(){
	if (itimer) clearInterval(itimer);
	if (timeout) clearTimeout(timeout);
        if (div1.parentNode)
	    div1.parentNode.removeChild(div1);
        if (div2.parentNode)
	    div2.parentNode.removeChild(div2);}
    function checking(){
	var w1=div1.offsetWidth;
	var w2=div2.offsetWidth;
	var now=(new Date()).getTime();
	if (w1!==w2) {
	    if (console.log)
		console.log("["+(now-start)/1000+"s] Open Sans loaded, "+
			    "divs at @ "+w1+"!="+w2);
	    if (html.className)
		html.className=html.className+" _HAVEOPENSANS";
	    else html.className="_HAVEOPENSANS";
	    cleanup();
            return false;}
	else if (console.log)
	    console.log("["+(now-start)/1000+"s] unloaded, "+
			"divs still equal @ "+w1+"!="+w2);
	else {}
        return true;}
    function giveup(){
	var w1=div1.offsetWidth;
	var w2=div2.offsetWidth;
	var now=(new Date()).getTime();
        if (console.log)
            console.log("Giving up on loading Open Sans after "+
                        (now-start)/1000+"s, "+w1+"=="+w2);
        cleanup();}
    if (checking()) {
        itimer=setInterval(checking,check_interval);
        timeout=setTimeout(giveup,timeout_after);}})();

/* Emacs local variables
   ;;;  Local variables: ***
   ;;;  compile-command: "cd ..; make" ***
   ;;;  indent-tabs-mode: nil ***
   ;;;  End: ***
*/
