/* -*- Mode: Javascript; Character-encoding: utf-8; -*- */

/* ###################### metareader/interaction.js ###################### */

/* Copyright (C) 2009-2017 beingmeta, inc.

   This file implements most of the interaction handling for the
   e-reader web application.

   This file is part of metaReader, a Javascript/DHTML web application for reading
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
/* global metaReader: false */

(function(){
    "use strict";

    var fdjtDOM=fdjt.DOM;
    var fdjtLog=fdjt.Log;
    var fdjtTime=fdjt.Time;
    var cancel=fdjtDOM.cancel;
    var getTarget=fdjtDOM.T;
    var hasParent=fdjtDOM.hasParent;
    var addClass=fdjtDOM.addClass;
    var dropClass=fdjtDOM.dropClass;

    var mR=metaReader, $ID=fdjt.ID;
    var Trace=mR.Trace;

    /* Full page zoom mode */
    
    function startZoom(node){
        var zoom_target=$ID("METABOOKZOOMTARGET"), copy;
        if ((Trace.zoom)||(Trace.mode)) fdjtLog("startZoom %o",node);
        if (!(node)) return stopZoom();
        if (metaReader.zoomtarget===node) {
            metaReader.zoomed=node;
            addClass(document.body,"mbZOOM");}
        else {
            mR.zoomX=mR.zoomY=mR.zoomscale=false;}
        metaReader.zoomtarget=node;
        if (!(metaReader.layout)) {}
        else {
            var layout=metaReader.layout;
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
        addClass(document.body,"mbZOOM");
        if (!(mR.zoomscale)) {
            var mz=$ID("METABOOKZOOM");
            var zb=$ID("METABOOKZOOM");
            var xscale=((0.9*mz.clientWidth)/mz.scrollWidth);
            var yscale=((0.9*mz.clientHeight)/mz.scrollHeight);
            mR.zoomscale=1; zb.style[fdjt.DOM.transform]="";
            if (xscale<yscale) setZoom(xscale);
            else setZoom(yscale);}}
    metaReader.startZoom=startZoom;

    function stopZoom(evt){
        dropClass(document.body,"mbZOOM");
        metaReader.zoomed=false;
        if (evt) fdjt.UI.cancel(evt);}
    metaReader.stopZoom=stopZoom;

    function setZoom(scale,zx,zy) {
        var mz=$ID("METABOOKZOOM");
        var zb=$ID("METABOOKZOOMBOX");
        var rx=mz.scrollLeft/mz.scrollWidth;
        var ry=mz.scrollTop/mz.scrollHeight;
        if (typeof zx === 'number') {
            mR.zoomX=zx||0; mR.zoomY=zy||0;}
        else if (typeof mR.zoomX === 'number') {
            zx=mR.zoomX; zy=mR.zoomY;}
        else {}
        if ((Trace.zoom)||(Trace.gestures)) {
            if (typeof zx=== 'number')
                fdjtLog("setZoom(%o) @%o,%o %o",scale,zx,zy,zb);
            else fdjtLog("setZoom(%o) @%o,%o %o",scale,rx,ry,zb);}
        if (!(scale)) {
            mR.zoomX=mR.zoomY=false;
            mR.zoomscale=1; zb.style[fdjt.DOM.transform]="";
            var xscale=((0.9*mz.clientWidth)/mz.scrollWidth);
            var yscale=((0.9*mz.clientHeight)/mz.scrollHeight);
            if (xscale<yscale) setZoom(xscale);
            else setZoom(yscale);}
        else {
            metaReader.zoomscale=scale;
            if (typeof zx === 'number') {
                zb.style[fdjt.DOM.transform]=
                    "translate3d("+zx+"px,"+zy+"px,0px) "+
                    "scale("+scale+")";}
            else zb.style[fdjt.DOM.transform]="scale("+scale+")";
            if (Trace.zoom)
                fdjtLog("%s=%s %o",fdjt.DOM.transform,zb.style[fdjt.DOM.transform],
                        zb);}
        if (typeof zx !== 'number') {
            mR.zoomX=mR.zoomY=false;
            mz.scrollLeft=rx*mz.scrollWidth;
            mz.scrollTop=ry*mz.scrollHeight;}}
    function zoom(adjust){
        if (!(adjust)) setZoom(false);
        else setZoom((metaReader.zoomscale||1)*adjust);}
    metaReader.zoom=zoom;

    function zoomIn(evt){
        evt=evt||window.event; zoom(1.1); fdjt.UI.cancel(evt);}
    function zoomOut(evt){
        evt=evt||window.event; zoom(1/1.1); fdjt.UI.cancel(evt);}
    function unZoom(evt){
        evt=evt||window.event; zoom(false); fdjt.UI.cancel(evt);}

    var d_start, d_last, cg_x, cg_y;
    var panstart_x, panstart_y, panstart_t, pan_dx, pan_dy;
    function zoom_touchstart(evt){
        if (!((evt)&&(evt.touches)&&(evt.touches.length>=1))) return;
        var zc=$ID("METABOOKZOOMCONTROLS"), target=getTarget(evt);
        if (hasParent(target,zc)) return;
        var touches=evt.touches, touch1=touches[0];
        var zoomscale=mR.zoomscale||1;
        var cx1=touch1.clientX, x1=(cx1-(mR.zoomX||0))/zoomscale;
        var cy1=touch1.clientY, y1=(cy1-(mR.zoomY||0))/zoomscale;
        if (evt.touches.length===2) {
            var touch2=touches[1];
            var cx2=touch2.clientX, x2=(cx2-(mR.zoomX||0))/zoomscale;
            var cy2=touch2.clientY, y2=(cy2-(mR.zoomY||0))/zoomscale;
            var dx=cx2-cx1, dy=cy2-cy1;
            var d=Math.sqrt((dx*dx)+(dy*dy));
            cg_x=(x1+x2)/2; cg_y=(y1+y2)/2;
            if ((Trace.zoom)||(Trace.gestures))
                fdjtLog("zoom_touchstart(2) %o: d=%o@[%o,%o] [%o,%o]-[%o,%o]",
                        evt,d,cg_x,cg_y,x1,y1,x2,y2);
            d_last=d_start=d;
            panstart_x=panstart_y=pan_dx=pan_dy=false;
            cancel(evt);}
        else if (evt.touches.length===1) {
            panstart_x=x1;
            panstart_y=y1;
            panstart_t=fdjtTime();
            if ((Trace.zoom)||(Trace.gestures))
                fdjtLog("zoom_touchstart(1) %o: [%o,%o]",evt,x1,y1);
            cancel(evt);}
        else {}}
    function zoom_touchmove(evt){
        if (!((evt)&&(evt.touches)&&(evt.touches.length>=1))) return;
        var zb=$ID("METABOOKZOOMBOX"); var zbs=zb.style;
        var off_x=(mR.zoomX||0), off_y=(mR.zoomY||0);
        var zoomscale=mR.zoomscale||1; 
        var transform=fdjtDOM.transform;
        var touches=evt.touches, touch1=touches[0];
        var cx1=touch1.clientX, x1=(cx1-off_x)/zoomscale;
        var cy1=touch1.clientY, y1=(cy1-off_y)/zoomscale;
        if ((evt.touches.length===2)&&(typeof d_last === 'number')) {
            var touch2=touches[1];
            var cx2=touch2.clientX, x2=(cx2-off_x)/zoomscale;
            var cy2=touch2.clientY, y2=(cy2-off_y)/zoomscale;
            var ncg_x=(x1+x2)/2, ncg_y=(y1+y2)/2;
            var dx=cx2-cx1, dy=cy2-cy1, d=Math.sqrt((dx*dx)+(dy*dy));
            var scale=((d/d_start)*(zoomscale));
            off_x=off_x+((ncg_x*zoomscale)-(ncg_x*scale));
            off_y=off_y+((ncg_y*zoomscale)-(ncg_y*scale));
            if ((Trace.zoom)||(Trace.gestures>1))
                fdjtLog("zoom_touchmove(2) %o: d=%o->%o@[%o,%o] [%o,%o] [%o,%o], z=%o=>%o",
                        evt,d_last,d,ncg_x,ncg_y,x1,y1,x2,y2,zoomscale,scale);
            zbs[transform]="translate3d("+off_x+"px,"+off_y+"px,0px) "+"scale("+scale+")";
            if (Trace.zoom) fdjtLog("%s %o: %s",transform,zb,zbs[transform]);
            cg_x=ncg_x; cg_y=ncg_y; d_last=d;
            cancel(evt);}
        else if ((evt.touches.length===1)&&(typeof panstart_x === 'number')) {
            pan_dx=(x1-panstart_x)*zoomscale; pan_dy=(y1-panstart_y)*zoomscale;
            off_x=off_x+pan_dx; off_y=off_y+pan_dy; 
            if ((Trace.zoom)||(Trace.gestures>1))
                fdjtLog("zoom_touchmove(1) %o: [%o,%o]=[%o,%o]+([%o,%o]=[%o,%o]-[%o,%o])",
                        evt,off_x,off_y,mR.zoomX,mR.zoomY,pan_dx,pan_dy,
                        x1,y1,panstart_x,panstart_y);
            zbs[transform]=
                "translate3d("+off_x+"px,"+off_y+"px,0px) "+"scale("+zoomscale+")";
            if (Trace.zoom) fdjtLog("%s %o: %s",transform,zb,zbs[transform]);
            cancel(evt);}
        else {}}
    function zoom_touchend(evt){
        var zoomscale=mR.zoomscale||1;
        var off_x=(mR.zoomX||0), off_y=(mR.zoomY||0);
        if ((d_last)&&(d_start)) {
            var scale=(d_last/d_start);
            off_x=off_x+((cg_x*zoomscale)-(cg_x*scale*zoomscale));
            off_y=off_y+((cg_y*zoomscale)-(cg_y*scale*zoomscale));
            if ((Trace.zoom)||(Trace.gestures))
                fdjtLog("zoom_touchend(2) %o: %o=%o/%o@[%o,%o] zx=%o zy=%o",
                        evt,scale,d_last,d_start,cg_x,cg_y,off_x,off_y);
            setZoom((scale)*(zoomscale),off_x,off_y);
            off_x=off_y=d_last=d_start=false;}
        else if (typeof panstart_x === 'number') {
            var new_x=(mR.zoomX||0), new_y=(mR.zoomY||0), now=fdjtTime();
            if ((Trace.zoom)||(Trace.gestures))
                fdjtLog("zoom_touchend(2) %o: [%o,%o]=[%o,%o] start [%o,%o]",
                        evt,new_x+pan_dx,new_y+pan_dy,pan_dx,pan_dy,
                        panstart_x,panstart_y);
            if ((now-panstart_t)<500) {
                if ((Trace.zoom)||(Trace.gestures))
                    fdjtLog("tapzoom_touchend(2) %o: [%o,%o]=[%o,%o] start [%o,%o]",
                            evt,new_x+pan_dx,new_y+pan_dy,pan_dx,pan_dy,
                            panstart_x,panstart_y);
                mR.zoomX=panstart_x; mR.zoomY=panstart_y;
                setZoom(1.1*zoomscale,mR.zoomX,mR.zoomY);}
            else {
                mR.zoomX=new_x+pan_dx; mR.zoomY=new_y+pan_dy;}
            pan_dx=pan_dy=panstart_x=panstart_y=false;}
        else {}}

    fdjt.DOM.defListeners(
        metaReader.UI.handlers.mouse,
	{"#METABOOKZOOMCLOSE": {click: stopZoom},
         "#METABOOKZOOMHELP": {click: metaReader.toggleHelp},
         "#METABOOKZOOMIN": {click: zoomIn},
         "#METABOOKZOOMOUT": {click: zoomOut},
         "#METABOOKUNZOOM": {click: unZoom}});

    fdjt.DOM.defListeners(
        metaReader.UI.handlers.touch,
        {"#METABOOKZOOM": {
            touchstart: zoom_touchstart,
            touchmove: zoom_touchmove,
            touchend: zoom_touchend},
         "#METABOOKZOOMCLOSE": {click: metaReader.stopZoom},
         "#METABOOKZOOMHELP": {click: metaReader.toggleHelp},
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
        if (metaReader.showing===url) {
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
        metaReader.showing=url;
        if ((src_elt)&&(mR.glossdata[url])) {
            src_elt.src=mR.glossdata[url];
            placeMedia();}
        else if (src_elt) {
            addClass($ID("METABOOKMEDIA"),"loadingcontent");
            addClass(src_elt,"loadingcontent");
            metaReader.getGlossData(url).then(function(val){
                dropClass($ID("METABOOKMEDIA"),"loadingcontent");
                dropClass(src_elt,"loadingcontent");
                src_elt.src=val;
                placeMedia();})
            .catch(function(ex){
                fdjt.Log("Couldn't fetch glossdata from %s: %o",url,ex);
                metaReader.showing=url;
                dropClass($ID("METABOOKMEDIA"),"loadingcontent");
                dropClass(src_elt,"loadingcontent");});}
        else placeMedia();}
    metaReader.showMedia=showMedia;
    function hideMedia(){
        dropClass(document.body,"mbMEDIA");}
    metaReader.hideMedia=hideMedia;

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

    function zoomMedia(evt){
        evt=evt||window.event;
        var target=getTarget(evt);
        var media_elt=$ID("METABOOKMEDIATARGET");
        if ((target===media_elt)&&(fdjtDOM.isImage(target))) {
            dropClass(document.body,"mbMEDIA");
            mR.startZoom(media_elt);}}

    fdjt.DOM.defListeners(
        metaReader.UI.handlers.mouse,
        {"#METABOOKCLOSEMEDIA": {mousedown: closeMedia_tapped},
         "#METABOOKMEDIA": {click: zoomMedia}});

    fdjt.DOM.defListeners(
        metaReader.UI.handlers.touch,
        {"#METABOOKCLOSEMEDIA": {touchend: closeMedia_tapped},
         "#METABOOKMEDIA": {touchend: zoomMedia}});

})();


/* Emacs local variables
   ;;;  Local variables: ***
   ;;;  compile-command: "cd ..; make" ***
   ;;;  indent-tabs-mode: nil ***
   ;;;  End: ***
*/

