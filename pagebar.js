/* -*- Mode: Javascript; Character-encoding: utf-8; -*- */

/* ###################### metabook/pagebar.js ###################### */

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

(function(){
    "use strict";
    var fdjtDOM=fdjt.DOM, fdjtLog=fdjt.Log, fdjtUI=fdjt.UI, fdjtID=fdjt.ID;
    var fdjtString=fdjt.String;
    var dropClass=fdjtDOM.dropClass, hasClass=fdjtDOM.hasClass;
    var hasParent=fdjtDOM.hasParent, getParent=fdjtDOM.getParent;
    var mB=metaBook, mbDOM=metaBook.DOM, previewTimeout=mB.previewTimeout;
    var cancel=fdjtUI.cancel;
    var Trace=metaBook.Trace;

    function getGoPage(target){
        return parseInt(target.innerHTML,10);}

    var previewing_page=false, preview_start_page=false;
    function pagebar_hold(evt,target){
        evt=evt||window.event; if (!(target)) target=fdjtUI.T(evt);
        var pagebar=fdjtID("METABOOKPAGEBAR");
        previewTimeout(false);
        if (((mB.hudup)||(mB.mode))&&
            (!(mB.fullheight))) {
            fdjtUI.cancel(evt);
            metaBook.setMode(false);
            return;}
        if (target.nodeType===3) target=target.parentNode;
        if (((hasParent(target,pagebar))&&(target.tagName!=="SPAN")))
            return;
        var gopage=getGoPage(target,evt);
        if ((Trace.gestures)||(hasClass(pagebar,"metabooktrace")))
            fdjtLog("pagebar_span_hold %o t=%o gopage: %o=>%o/%o, start=%o",
                    evt,target,previewing_page,gopage,mB.pagecount,
                    preview_start_page);
        if (!(preview_start_page)) preview_start_page=gopage;
        if (previewing_page===gopage) return;
        if (!(gopage)) {
            // fdjtLog.warn("Couldn't get page from METABOOKPAGEBAR");
            return;}
        if (previewing_page)
            pagebar.title=fdjtString(
                "Release to go to this page (%d), move away to return to page %d",
                gopage,mB.curpage);
        else pagebar.title=fdjtString(
            ((mB.touch)?
             ("Release to return to page %d, tap the content or margin to settle here (page %d)"):
             ("Release to return to page %d, tap a key to settle here (page %d)")),
            metaBook.curpage,gopage);
        previewing_page=gopage;
        metaBook.startPreview(
            "CODEXPAGE"+previewing_page,"pagebar_span_hold/timeout");}
    function pagebar_tap(evt,target){
        evt=evt||window.event; if (!(target)) target=fdjtUI.T(evt);
        var pagebar=fdjtID("METABOOKPAGEBAR");
        if ((Trace.gestures)||(hasClass(pagebar,"metabooktrace")))
            fdjtLog("pagebar_tap %o",evt);
        previewTimeout(false);
        if ((mB.previewing)&&(!(previewing_page))) {
            metaBook.stopPreview("pagebar_tap",true);
            return;}
        if ((mB.hudup)||(mB.mode)||(mB.cxthelp)) {
            if (Trace.gestures)
                fdjtLog("clearHUD %s %s %s",mB.mode,
                        ((mB.hudup)?"hudup":""),
                        ((mB.cxthelp)?"hudup":""));
            fdjtUI.cancel(evt);
            metaBook.setMode(false);
            return;}
        if (target.nodeType===3) target=target.parentNode;
        if (((hasParent(target,pagebar))&&(target.tagName!=="SPAN")))
            return;
        var gopage=getGoPage(target,evt);
        if (previewing_page===gopage) return;
        metaBook.GoToPage(gopage,"pagebar_tap",true);
        metaBook.setMode(false);}
    function pagebar_release(evt,target){
        evt=evt||window.event; if (!(target)) target=fdjtUI.T(evt);
        var pagebar=fdjtID("METABOOKPAGEBAR");
        if ((Trace.gestures)||(hasClass(pagebar,"metabooktrace")))
            fdjtLog("pagebar_release %o, previewing=%o, ptarget=%o start=%o",
                    evt,mB.previewing,mB.previewTarget,
                    preview_start_page);
        previewTimeout(false);
        if (target.nodeType===3) target=target.parentNode;
        if (!(mB.previewing)) {preview_start_page=false; return;}
        dropClass(target,"preview");
        metaBook.stopPreview("pagebar_release",true);
        preview_start_page=false;
        previewing_page=false;
        fdjtUI.cancel(evt);
        if (((hasParent(target,pagebar))&&(target.tagName==="SPAN"))) {
            return;}}
    function pagebar_slip(evt,target){
        evt=evt||window.event; if (!(target)) target=fdjtUI.T(evt);
        var rel=evt.relatedTarget;
        var pagebar=fdjtID("METABOOKPAGEBAR");
        previewTimeout(false);
        if ((Trace.gestures)||(hasClass(pagebar,"metabooktrace")))
            fdjtLog("pagebar_slip %o, pre=%o, target=%o start=%o, rel=%o",
                    evt,mB.previewing,mB.previewTarget,
                    preview_start_page,rel);
        if (!(mB.previewing)) return;
        if (getParent(rel,mbDOM.pagebar)) return;
        if ((rel)&&(hasParent(rel,mB.body)))
            previewTimeout(function(){
                var pagebar=fdjtID("METABOOKPAGEBAR");
                pagebar.title=""; metaBook.GoTo(rel,evt);});
        else previewTimeout(function(){
            var pagebar=fdjtID("METABOOKPAGEBAR");
            pagebar.title=""; dropClass(target,"preview");
            metaBook.stopPagePreview("pagebar_slip/timeout");});
        previewing_page=false;}
    function pagebar_touchtoo(evt,target){
        evt=evt||window.event; if (!(target)) target=fdjtUI.T(evt);
        if (mB.previewing) {
            metaBook.stopPreview("touchtoo");
            fdjtUI.TapHold.clear();
            metaBook.setHUD(false);
            fdjt.UI.cancel(evt);
            return false;}}
    
    fdjt.DOM.defListeners(
        metaBook.UI.handlers.mouse,
        {"#METABOOKPAGEBAR": {
            tap: pagebar_tap,
            hold: pagebar_hold,
            release: pagebar_release,
            slip: pagebar_slip,
            click: cancel}});
    
    fdjt.DOM.defListeners(
        metaBook.UI.handlers.touch,
        {"#METABOOKPAGEBAR": {tap: pagebar_tap,
                              hold: pagebar_hold,
                              release: pagebar_release,
                              slip: pagebar_slip,
                              touchtoo: pagebar_touchtoo,
                              click: cancel}});

})();

/* Emacs local variables
   ;;;  Local variables: ***
   ;;;  compile-command: "cd ..; make" ***
   ;;;  indent-tabs-mode: nil ***
   ;;;  End: ***
*/
