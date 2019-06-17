/* -*- Mode: Javascript; Character-encoding: utf-8; -*- */

/* ###################### metareader/preview.js ###################### */

/* Copyright (C) 2009-2017 beingmeta, inc.
   This file implements a Javascript/DHTML web application for reading
   large structured documents.

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
    var fdjtDOM=fdjt.DOM, fdjtLog=fdjt.Log;
    var dropClass=fdjtDOM.dropClass, addClass=fdjtDOM.addClass;
    var hasClass=fdjtDOM.hasClass;
    var mR=metaReader, mbID=mR.ID, getTarget=mR.getTarget;
    var Trace=mR.Trace;
    var mbGoTo=mR.GoTo;

    // Preview functions
    var oldscroll=false, preview_elt=false;
    function scrollPreview(elt,caller){
        var xoff=window.scrollLeft||0, yoff=window.scrollTop||0;
        if (elt) {
            if (elt.frag) elt=elt.frag;
            if (typeof elt==="string") elt=mbID(elt);
            if (!(elt)) return;
            else preview_elt=elt;
            if (!(oldscroll)) oldscroll={x: 0,y: yoff};
            var offinfo=fdjtDOM.getGeometry(elt,mR.content);
            if (Trace.flips)
                fdjtLog("startScrollPreview/%s to %d for %o",
                        caller||"nocaller",offinfo.top-100,elt);
            // metaReader.content.style.top=(-offinfo.top)+"px";
            var use_top=offinfo.top-((fdjtDOM.viewHeight()-50)/2);
            if (use_top<0) use_top=0;
            window.scrollTo(0,use_top);}
        else if (oldscroll) {
            if (Trace.flips)
                fdjtLog("stopScrollPreview/%s to %j from %d,%d(%o)",
                        caller||"nocaller",oldscroll,xoff,yoff,
                        preview_elt);
            preview_elt=false;
            window.scrollTo(oldscroll.x,oldscroll.y);
            oldscroll=false;}
        else {
            if (Trace.flips)
                fdjtLog("stopScrollPreview/%s to %j from %d,%d(%o)",
                        caller||"nocaller",oldscroll,xoff,yoff,
                        preview_elt);
            preview_elt=false; oldscroll=false;}}
    
    function clearPreview(){
        var current=fdjtDOM.$(".mbpreviewing");
        var i=0, lim=current.length; while (i<lim) {
            var p=current[i++];
            dropClass(p,"mbpreviewing");
            mR.clearHighlights(p);}}

    function startPreview(spec,caller){
        var target=((spec.nodeType)?(spec):(mbID(spec)));
        if ((Trace.flips)||(Trace.preview))
            fdjtLog("startPreview %o (%s)",target,caller);
        if (target===mR.previewing) {}
        if (mR.skimming) mR.stopSkimming();
        if (mR.layout instanceof fdjt.Codex) {
            var dups=((getTarget(target))&&(mR.getDups(target)));
            mR.startPagePreview(target,caller);
            addClass(target,"mbpreviewing");
            if (dups) addClass(dups,"mbpreviewing");}
        else {
            scrollPreview(target,caller);
            addClass(target,"mbpreviewing");}
        metaReader.previewing=target;
        addClass(document.body,"mbPREVIEW");
        if (hasClass(target,"codexpage"))
            addClass(document.body,"mbPAGEPREVIEW");
        return target;}
    metaReader.startPreview=startPreview;
    function stopPreview(caller,jumpto){
        clearPreview();
        if ((jumpto)&&(!(jumpto.nodeType)))
            jumpto=mR.previewTarget||mR.previewing;
        if ((Trace.flips)||(Trace.preview))
            fdjtLog("stopPreview/%s jump to %o, pt=%o, p=%o",
                    caller||"nocaller",jumpto,
                    mR.previewTarget,mR.previewing);
        if (mR.layout instanceof fdjt.Codex) {
            mR.stopPagePreview(caller,jumpto);}
        else if (!(jumpto)) scrollPreview(false,caller);
        else if (jumpto===mR.previewing) {
            oldscroll=false; scrollPreview(false,caller);}
        else scrollPreview(false,caller);
        mR.previewing=false; mR.previewTarget=false;
        dropClass(document.body,"mbPREVIEW");
        dropClass(document.body,"mbPAGEPREVIEW");
        if (jumpto) {
            if (mR.hudup) mR.setHUD(false);
            mbGoTo(jumpto);}
        return false;}
    metaReader.stopPreview=stopPreview;})();

/* Emacs local variables
   ;;;  Local variables: ***
   ;;;  compile-command: "cd ..; make" ***
   ;;;  indent-tabs-mode: nil ***
   ;;;  End: ***
*/
