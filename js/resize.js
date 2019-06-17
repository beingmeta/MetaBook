/* -*- Mode: Javascript; Character-encoding: utf-8; -*- */

/* ###################### metareader/nav.js ###################### */

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
/* globals Promise */

// resize.js
(function (){
    "use strict";
    var fdjtDOM=fdjt.DOM, fdjtLog=fdjt.Log, $ID=fdjt.ID;
    var hasClass=fdjtDOM.hasClass;
    var addClass=fdjtDOM.addClass;
    var showPage=fdjt.showPage;
    var fdjtUI=fdjt.UI;
    var Trace=metaReader.Trace, mR=metaReader;

    var getGeometry=fdjtDOM.getGeometry;

    // This is the window outer dimensions, which is stable across
    // most chrome changes, especially on-screen keyboards.  We
    // track so that we can avoid layout updates for resizes which
    // don't really require them.
    var inner_height=window.innerHeight, inner_width=window.innerWidth;

    /* Whether to resize by default */
    var resize_default=false;
    var ui_resize_wait=false, ui_resize_done=[];
    var ui_width=false, ui_height=false;
    
    function resizeUI(wait){
        function resizing(done){
            if (ui_resize_wait) clearTimeout(ui_resize_wait);
            ui_resize_wait=setTimeout(function(){
                var h=fdjtDOM.viewHeight(), w=fdjtDOM.viewWidth();
                if ((w!==ui_width)||(h!==ui_height)) {
                    var adjstart=fdjt.Time();
                    var hud=$ID("METABOOKHUD");
                    var cover=$ID("METABOOKCOVER");
                    ui_height=h; ui_width=w;
                    if (cover) mR.resizeCover(cover);
                    if (hud) mR.resizeHUD(hud);
                    if ((hud)||(cover))
                        fdjtLog("Resized UI in %fsecs, running %d callbacks",
                                ((fdjt.Time()-adjstart)/1000),
                                ui_resize_done.length);}
                var when_done=ui_resize_done; 
                ui_resize_wait=false; ui_resize_done=[];
                var i=0, n=when_done.length;
                while (i<n) when_done[i++]();},
                                      wait);
            ui_resize_done.push(done);}
        if (typeof wait !== "number") wait=100;
        return new Promise(resizing);}

    metaReader.resizeUI=resizeUI;

    function metareaderResize(){
        if ((hasClass(document.body,"mbZOOM"))||
            (hasClass(document.body,"mbMEDIA"))) {
            resizing=setTimeout(metareaderResize,1000);
            return;}
        if (resizing) {
            clearTimeout(resizing); resizing=false;}
        updateSizeClasses();
        mR.resizeUI();
        resizePagers();
        resizeLayout();}
    metaReader.resize=metareaderResize;

    function resizeLayout() {
        var layout=mR.layout;
        // Unscale the layout
        if (layout) mR.scaleLayout(false);
        if ((window.innerWidth===inner_width)&&
            (window.innerHeight===inner_height)) {
            // Not a real change (we think), so just scale the
            // layout, don't make a new one.
            if (layout) metaReader.scaleLayout(true);
            if (Trace.resize) fdjtLog("Resize to norm, ignoring");
            return;}
        if (Trace.resize)
            fdjtLog("Real resize w/layout=%o",layout);
        // Set these values to the new one
        inner_width=window.innerWidth;
        inner_height=window.innerHeight;
        // Possibly a new layout
        var width=getGeometry($ID("CODEXPAGE"),false,true).width;
        var height=getGeometry($ID("CODEXPAGE"),false,true).inner_height;
        if ((layout)&&(layout.width===width)&&(layout.height===height)) {
            if (Trace.resize) fdjtLog("Layout size unchanged, ignoring");
            return;}
        if ((mR.layout)&&(fdjt.device.fixedframe)) {
            // On fixed frame devices (phones, tablets, etc), only
            // resize the layout if there's been an orientation
            // change.
            var orientation=Math.abs(window.orientation)%180;
            var layout_orientation=
                ((mR.layout.orientation)&&
                 (Math.abs(mR.layout.orientation)%180));
            if (orientation === layout_orientation) {
                mR.scaleLayout(true);
                return;}}
        if ((layout)&&(layout.onresize)&&(!(metaReader.freezelayout))) {
            // This handles prompting for whether or not to update
            // the layout.  We don't prompt if the layout didn't
            // take very long (metaReader.long_layout_thresh) or is already
            // cached (metaReader.layoutCached()).
            if ((metaReader.long_layout_thresh)&&(layout.started)&&
                ((layout.done-layout.started)<=metaReader.long_layout_thresh))
                resizing=setTimeout(resizeLayoutNow,50);
            else if (choosing_resize) {}
            else if (metaReader.layoutCached())
                resizing=setTimeout(resizeLayoutNow,50);
            else {
                // This prompts for updating the layout
                var msg=fdjtDOM("div.title","Update layout?");
                // This should be fast, so we do it right away.
                mR.scaleLayout(true);
                choosing_resize=true;
                // When a choice is made, it becomes the default
                // When a choice is made to not resize, the
                // choice timeout is reduced.
                var choices=[
                    {label: "Yes",
                     handler: function(){
                         choosing_resize=false;
                         resize_default=true;
                         metaReader.layout_choice_timeout=10;
                         resizing=setTimeout(resizeLayoutNow,50);},
                     isdefault: resize_default},
                    {label: "No",
                     handler: function(){
                         choosing_resize=false;
                         resize_default=false;
                         metaReader.layout_choice_timeout=10;},
                     isdefault: (!(resize_default))}];
                var spec={choices: choices,
                          timeout: (metaReader.layout_choice_timeout||
                                    metaReader.choice_timeout||20),
                          spec: "div.fdjtdialog.fdjtconfirm.updatelayout"};
                choosing_resize=fdjtUI.choose(spec,msg);}}}

    function resizeLayoutNow(evt){
        if (resizing) clearTimeout(resizing);
        resizing=false;
        metaReader.layout.onresize(evt);}

    function resizePagers(){
        var pagers=fdjtDOM.$(".fdjtpage");
        var i=0, lim=pagers.length; while (i<lim) {
            var pager=pagers[i++];
            if (pager.offsetHeight) showPage.update(pager);
            else addClass(pager,"needsresize");}}

    var sizeclass_regexp=/\b_(NARROW|WIDE|REALLYSHORT|SHORT|TALL)\b/g;
    function updateSizeClasses(){
        var addClass=fdjtDOM.addClass, body=document.body;
        var w=fdjtDOM.viewWidth(), h=fdjtDOM.viewHeight();
        fdjtDOM.dropClass(body,sizeclass_regexp);
        if (w<700) addClass(body,"_NARROW");
        else if (w>1200) addClass(body,"_WIDE");
        else {}
        if (h<350) addClass(document.body,"_REALLYSHORT");
        else if (h<600) addClass(document.body,"_SHORT");
        else if (h>1200) addClass(document.body,"_TALL");
        else {}}
    metaReader.updateSizeClasses=updateSizeClasses;

    var resizing=false;
    var resize_wait=false;
    var choosing_resize=false;
    
    function resizeHandler(evt){
        evt=evt||window.event;
        if (Trace.resize)
            fdjtLog("Resize event %o, waiting=%o",evt,resize_wait);
        if (resize_wait) clearTimeout(resize_wait);
        if (choosing_resize) {
            if (Trace.resize) fdjtLog("Close resize dialog %o",evt);
            fdjt.Dialog.close(choosing_resize);
            choosing_resize=false;}
        resize_wait=setTimeout(metareaderResize,metaReader.resize_wait);}
    metaReader.resizeHandler=resizeHandler;

})();

/* Emacs local variables
   ;;;  Local variables: ***
   ;;;  compile-command: "cd ..; make" ***
   ;;;  indent-tabs-mode: nil ***
   ;;;  End: ***
*/
