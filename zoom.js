/* -*- Mode: Javascript; Character-encoding: utf-8; -*- */

/* ###################### metabook/interaction.js ###################### */

/* Copyright (C) 2009-2015 beingmeta, inc.

   This file implements most of the interaction handling for the
   e-reader web application.

   This file is part of metaBook, a Javascript/DHTML web application for reading
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
/* global metaBook: false */

(function(){
    "use strict";

    var fdjtDOM=fdjt.DOM;

    var mB=metaBook, $ID=fdjt.ID;
    var addClass=fdjtDOM.addClass;
    var dropClass=fdjtDOM.dropClass;

    /* Full page zoom mode */
    
    function startZoom(node){
        var zoom_target=$ID("METABOOKZOOMTARGET"), copy;
        if (!(node)) return stopZoom();
        if (metaBook.zoomtarget===node) {
            metaBook.zoomed=node;
            addClass(document.body,"mbZOOM");}
        metaBook.zoomtarget=node;
        if (!(metaBook.layout)) {}
        else {
            var layout=metaBook.layout;
            var id=node.getAttribute("data-baseid")||node.id;
            if ((layout.lostids)&&(layout.lostids[id]))
                copy=layout.lostids[id].cloneNode(true);
            else if (layout.splits[id])
                copy=layout.splits[id].cloneNode(true);
            else {}}
        if (!(copy)) copy=node.cloneNode(true);
        fdjtDOM.stripIDs(copy,false,"data-baseid");
        copy.setAttribute("style","");
        copy.id="METABOOKZOOMTARGET";
        fdjt.DOM.replace(zoom_target,copy);
        addClass(document.body,"mbZOOM");}
    metaBook.startZoom=startZoom;

    function stopZoom(evt){
        dropClass(document.body,"mbZOOM");
        metaBook.zoomed=false;
        if (evt) fdjt.UI.cancel(evt);}
    metaBook.stopZoom=stopZoom;

    function setZoom(scale) {
        var mz=$ID("METABOOKZOOM");
        var zb=$ID("METABOOKZOOMBOX");
        var rx=mz.scrollLeft/mz.scrollWidth;
        var ry=mz.scrollTop/mz.scrollHeight;
        if (!(scale)) {
            zb.style[fdjt.DOM.transform]="";}
        else {
            metaBook.zoomscale=scale;
            zb.style[fdjt.DOM.transform]="scale("+scale+")";}
        mz.scrollLeft=rx*mz.scrollWidth;
        mz.scrollTop=ry*mz.scrollHeight;}
    function zoom(adjust){
        var zb=$ID("METABOOKZOOMBOX");
        if (!(adjust)) {
            zb.style[fdjt.DOM.transform]="";}
        else setZoom((metaBook.zoomscale||1)*adjust);}

    function zoomIn(evt){
        evt=evt||window.event; zoom(1.1); fdjt.UI.cancel(evt);}
    function zoomOut(evt){
        evt=evt||window.event; zoom(1/1.1); fdjt.UI.cancel(evt);}
    function unZoom(evt){
        evt=evt||window.event; zoom(false); fdjt.UI.cancel(evt);}

    var d_start, d_last, cg_x, cg_y;
    function zoom_touchstart(evt){
        if ((evt)&&(evt.touches)&&(evt.touches.length===2)) {
            var touches=evt.touches, touch1=touches[0], touch2=touches[1];
            var x1=touch1.touchX, y1=touch1.touchY;
            var x2=touch2.touchX, y2=touch2.touchY;
            var dx=x2-x1, dy=y2-y1;
            var d=Math.sqrt((dx*dx)+(dy*dy));
            cg_x=(x1+x2)/2; cg_y=(y1+y2)/2;
            d_last=d_start=d;}}
    function zoom_touchmove(evt){
        if ((evt)&&(evt.touches)&&(evt.touches.length===2)) {
            var zb=$ID("METABOOKZOOMBOX");
            var touches=evt.touches, touch1=touches[0], touch2=touches[1];
            var x1=touch1.touchX, y1=touch1.touchY;
            var x2=touch2.touchX, y2=touch2.touchY;
            var dx=x2-x1, dy=y2-y1;
            var d=Math.sqrt((dx*dx)+(dy*dy));
            zb.style[fdjt.DOM.transform]=
                "scale("+(d/d_start)+") scale ("+(mB.zoomscale||1)+")";
            cg_x=(x1+x2)/2; cg_y=(y1+y2)/2;
            d_last=d;}}
    function zoom_touchend(evt){
        if ((evt)&&(evt.touches)&&(evt.touches.length===2)) {
            zoom(d_last/d_start);
            d_last=d_start=false;}}

    fdjt.DOM.defListeners(
        metaBook.UI.handlers.mouse,
	{"#METABOOKZOOMCLOSE": {click: stopZoom},
         "#METABOOKZOOMHELP": {click: metaBook.toggleHelp},
         "#METABOOKZOOMIN": {click: zoomIn},
         "#METABOOKZOOMOUT": {click: zoomOut},
         "#METABOOKUNZOOM": {click: unZoom}});

    fdjt.DOM.defListeners(
        metaBook.UI.handlers.touch,
        {"#METABOOKZOOM": {
            touchstart: zoom_touchstart,
            touchmove: zoom_touchmove,
            touchend: zoom_touchend},
         "#METABOOKZOOMCLOSE": {click: metaBook.stopZoom},
         "#METABOOKZOOMHELP": {click: metaBook.toggleHelp},
         "#METABOOKZOOMIN": {touchend: zoomIn},
         "#METABOOKZOOMOUT": {touchend: zoomOut},
         "#METABOOKUNZOOM": {touchend: unZoom}});

    // Not yet implemented, but the idea is to save some number of
    // audio/video/iframe elements to make restoring them faster.
    // var saved_players=[];
    // var n_players_to_save=7;
    
    function showMedia(url,type){
        var media_target=$ID("METABOOKMEDIATARGET");
        var media_elt=false, src_elt=false;
        function placeMedia(){
            if (media_elt) {
                // if mediaTarget doesn't have a parent node,
                // it's been replaced, so we don't do anything
                if (media_target.parentNode)
                    fdjt.DOM.replace(media_target,media_elt);}
            else $ID("METABOOKMEDIA").appendChild(media_target);
            addClass(document.body,"mbMEDIA");}
        if (metaBook.showing===url) {
            addClass(document.body,"mbMEDIA");
            return;}
        else if (type.search("image")===0) {
            src_elt=media_elt=fdjtDOM("IMG");}
        else if (type.search("audio")===0) {
            src_elt=fdjtDOM("SOURCE");
            media_elt=fdjtDOM("AUDIO",src_elt);
            media_elt.setAttribute("CONTROLS","CONTROLS");
            media_elt.setAttribute("AUTOPLAY","AUTOPLAY");
            src_elt.type=type;}
        else if (type.search("video")===0) {
            src_elt=fdjtDOM("SOURCE");
            src_elt.type=type;
            media_elt=fdjtDOM("VIDEO",src_elt);
            media_elt.setAttribute("CONTROLS","CONTROLS");
            media_elt.setAttribute("AUTOPLAY","AUTOPLAY");}
        else if (url.search("https://www.youtube.com/embed/")===0) {
            url="https://www.youtube-nocookie.com/"+
                url.slice("https://www.youtube.com/".length);
            if (url.indexOf("?")>0) 
                url=url+"&rel=0";
            else url=url+"?rel=0";}
        else {
            src_elt=media_elt=fdjtDOM("IFRAME");}
        media_elt.id="METABOOKMEDIATARGET";
        metaBook.showing=url;
        if ((src_elt)&&(mB.glossdata[url])) {
            src_elt.src=mB.glossdata[url];
            placeMedia();}
        else if (src_elt) {
            addClass($ID("METABOOKMEDIA"),"loadingcontent");
            addClass(src_elt,"loadingcontent");
            metaBook.getGlossData(url).then(function(val){
                dropClass($ID("METABOOKMEDIA"),"loadingcontent");
                dropClass(src_elt,"loadingcontent");
                src_elt.src=val;
                placeMedia();})
            .catch(function(ex){
                fdjt.Log("Couldn't fetch glossdata from %s: %o",url,ex);
                metaBook.showing=url;
                dropClass($ID("METABOOKMEDIA"),"loadingcontent");
                dropClass(src_elt,"loadingcontent");});}
        else placeMedia();}
    metaBook.showMedia=showMedia;
    function hideMedia(){
        dropClass(document.body,"mbMEDIA");}
    metaBook.hideMedia=hideMedia;

    var pause_media_timeout=false;
    function closeMedia_tapped(evt){
        evt=evt||window.event;
        var media_elt=$ID("METABOOKMEDIATARGET");
        if (pause_media_timeout) {
            clearTimeout(pause_media_timeout);
            pause_media_timeout=false;
            dropClass(document.body,"mbMEDIA");}
        else if (evt.shiftKey) {
            clearTimeout(pause_media_timeout);
            pause_media_timeout=false;
            dropClass(document.body,"mbMEDIA");}
        else if ((media_elt)&&(media_elt.pause)&&
                 (!(media_elt.paused))) {
            pause_media_timeout=setTimeout(function(){
                media_elt.pause();
                pause_media_timeout=false;
                dropClass(document.body,"mbMEDIA");},
                                           1500);}
        else dropClass(document.body,"mbMEDIA");
        fdjt.UI.cancel(evt);}
    metaBook.hideMedia=hideMedia;

    fdjt.DOM.defListeners(
        metaBook.UI.handlers.mouse,
        {"#METABOOKCLOSEMEDIA": {mousedown: closeMedia_tapped}});

    fdjt.DOM.defListeners(
        metaBook.UI.handlers.touch,
        {"#METABOOKCLOSEMEDIA": {touchstart: closeMedia_tapped}});

})();


/* Emacs local variables
   ;;;  Local variables: ***
   ;;;  compile-command: "cd ..; make" ***
   ;;;  indent-tabs-mode: nil ***
   ;;;  End: ***
*/

