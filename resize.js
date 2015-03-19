/* -*- Mode: Javascript; Character-encoding: utf-8; -*- */

/* ###################### metabook/nav.js ###################### */

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

// resize.js
(function (){
    "use strict";
    var fdjtDOM=fdjt.DOM, fdjtLog=fdjt.Log, $ID=fdjt.ID;
    var fdjtUI=fdjt.UI;

    var getGeometry=fdjtDOM.getGeometry;

    // This is the window outer dimensions, which is stable across
    // most chrome changes, especially on-screen keyboards.  We
    // track so that we can avoid resizes which shouldn't force
    // layout updates.
    var outer_height=window.outerHeight, outer_width=window.outerWidth;

    /* Whether to resize by default */
    var resize_default=false;
    
    function resizeUI(wait){
        if (!(wait)) wait=100;
        setTimeout(function(){
            var adjstart=fdjt.Time();
            var hud=$ID("METABOOKHUD");
            var cover=$ID("METABOOKCOVER");
            if (cover) metaBook.resizeCover(cover);
            if (hud) metaBook.resizeHUD(hud);
            if ((hud)||(cover))
                fdjtLog("Resized UI in %fsecs",
                        ((fdjt.Time()-adjstart)/1000));},
                   100);}
    metaBook.resizeUI=resizeUI;

    function metabookResize(){
        var layout=metaBook.layout;
        if (resizing) {
            clearTimeout(resizing); resizing=false;}
        updateSizeClasses();
        metaBook.resizeUI();
        metaBook.sizeContent();
        metaBook.scaleLayout(false);
        if (!(layout)) return;
        else if ((metaBook.textinput)||
                 ((metaBook.touch)&&
                  (document.activeElement)&&
                  (document.activeElement.tagName==="INPUT")))
            return;
        if ((window.outerWidth===outer_width)&&
            (window.outerHeight===outer_height)) {
            // Not a real change (we think), so just scale the
            // layout, don't make a new one.
            metaBook.scaleLayout(true);
            return;}
        resizePagers();
        // Set these values to the new one
        outer_width=window.outerWidth;
        outer_height=window.outerHeight;
        // Possibly a new layout
        var width=getGeometry($ID("CODEXPAGE"),false,true).width;
        var height=getGeometry($ID("CODEXPAGE"),false,true).inner_height;
        if ((layout)&&(layout.width===width)&&(layout.height===height))
            return;
        if ((layout)&&(layout.onresize)&&(!(metaBook.freezelayout))) {
            // This handles prompting for whether or not to update
            // the layout.  We don't prompt if the layout didn't
            // take very long (metaBook.long_layout_thresh) or is already
            // cached (metaBook.layoutCached()).
            if ((metaBook.long_layout_thresh)&&(layout.started)&&
                ((layout.done-layout.started)<=metaBook.long_layout_thresh))
                resizing=setTimeout(resizeNow,50);
            else if (metaBook.layoutCached())
                resizing=setTimeout(resizeNow,50);
            else if (choosing_resize) {}
            else {
                // This prompts for updating the layout
                var msg=fdjtDOM("div.title","Update layout?");
                // This should be fast, so we do it right away.
                metaBook.scaleLayout();
                choosing_resize=true;
                // When a choice is made, it becomes the default
                // When a choice is made to not resize, the
                // choice timeout is reduced.
                var choices=[
                    {label: "Yes",
                     handler: function(){
                         choosing_resize=false;
                         resize_default=true;
                         metaBook.layout_choice_timeout=10;
                         resizing=setTimeout(resizeNow,50);},
                     isdefault: resize_default},
                    {label: "No",
                     handler: function(){
                         choosing_resize=false;
                         resize_default=false;
                         metaBook.layout_choice_timeout=10;},
                     isdefault: (!(resize_default))}];
                var spec={choices: choices,
                          timeout: (metaBook.layout_choice_timeout||
                                    metaBook.choice_timeout||20),
                          spec: "div.fdjtdialog.fdjtconfirm.updatelayout"};
                choosing_resize=fdjtUI.choose(spec,msg);}}}
    metaBook.resize=metabookResize;

    function resizePagers(){
        var pagers=metaBook.pagers;
        for (var mode in pagers) {
            if (pagers.hasOwnProperty(mode))
                pagers[mode].resized();}}

    function resizeNow(evt){
        if (resizing) clearTimeout(resizing);
        resizing=false;
        metaBook.layout.onresize(evt);}

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
    metaBook.updateSizeClasses=updateSizeClasses;

    var resizing=false;
    var resize_wait=false;
    var choosing_resize=false;
    
    function resizeHandler(evt){
        evt=evt||window.event;
        if (resize_wait) clearTimeout(resize_wait);
        if (choosing_resize) {
            fdjt.Dialog.close(choosing_resize);
            choosing_resize=false;}
        resize_wait=setTimeout(metabookResize,1000);}
    metaBook.resizeHandler=resizeHandler;

})();

/* Emacs local variables
   ;;;  Local variables: ***
   ;;;  compile-command: "cd ..; make" ***
   ;;;  indent-tabs-mode: nil ***
   ;;;  End: ***
*/
