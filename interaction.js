/* -*- Mode: Javascript; Character-encoding: utf-8; -*- */

/* ###################### metabook/interaction.js ###################### */

/* Copyright (C) 2009-2015 beingmeta, inc.

   This file implements most of the interaction handling for the
   e-reader web application.

   This file is part of metaBook, a Javascript/DHTML web application
   for reading large structured documents (sBooks).

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

/* Initialize these here, even though they should always be
   initialized before hand.  This will cause various code checkers to
   not generate unbound variable warnings when called on individual
   files. */
// var fdjt=((typeof fdjt !== "undefined")?(fdjt):({}));
// var metaBook=((typeof metaBook !== "undefined")?(metaBook):({}));
// var Knodule=((typeof Knodule !== "undefined")?(Knodule):({}));

/* There are four basic display modes:
   reading (minimal decoration, with 'minimal' configurable)
   skimming (card at top, buttons on upper edges)
   addgloss (addgloss form at top, text highlighted)
   tool (lots of tools unfaded)

   Tap on content:
   if not hudup and no mode, raise the HUD;
   if not hudup and mode, clear the mode
   if hudup, drop the HUD
   Hold on content:
   if adding gloss to target, raise the hud
   otherwise, start adding gloss to target
*/

/* New content interaction rules, based on assuming taphold for content */
/*
  tap: if previewing, stop and jump to the previewed location
  tap: if over anchor, detail, aside, etc, and fdjtselecting, treat it like a click below,
  tap: if over fdjtselecting, go to addgloss mode with the hud up, and pass event
  on to the fdjtselecting region
  tap: if on anchor, detail, aside, etc, either treat it especially (and set clicked to
  the current time) or ignore it (and let click handle it)
  tap: otherwise, go forward or backward based on the x position

  hold: if previewing, stop and jump to the previewed location
  hold: if over fdjtselecting, switch to addgloss with HUD down and pass it on.
  hold: if not over fdjtselecting:
  if not over a passage, toggle the HUD
  if over a passage, and no current glosstarget,
  start selecting, fake a press, create a gloss;
  if over a passage, and current glosstarget is a reply, retarget the reply;
  if over a passage, and current glosstarget hasn't been modified or save,
  retarget the gloss
*/

(function(){
    "use strict";

    var mB=metaBook;
    var Trace=mB.Trace;
    var fdjtString=fdjt.String;
    var showPage=fdjt.showPage;
    var fdjtState=fdjt.State;
    var fdjtTime=fdjt.Time;
    var fdjtLog=fdjt.Log;
    var fdjtDOM=fdjt.DOM;
    var fdjtUI=fdjt.UI;
    var fdjtAsync=fdjt.Async;
    var RefDB=fdjt.RefDB;
    var $ID=fdjt.ID;
    var mbID=metaBook.ID;

    // Imports (kind of)
    var addClass=fdjtDOM.addClass;
    var hasClass=fdjtDOM.hasClass;
    var dropClass=fdjtDOM.dropClass;
    var toggleClass=fdjtDOM.toggleClass;
    var getTarget=metaBook.getTarget;
    var getParent=fdjtDOM.getParent;
    var hasParent=fdjtDOM.hasParent;
    var isClickable=fdjtUI.isClickable;
    var getChild=fdjtDOM.getChild;
    var getChildren=fdjtDOM.getChildren;
    var getInput=fdjtDOM.getInput;
    var Selector=fdjtDOM.Selector;

    var isEmptyString=fdjtString.isEmpty;
    var decodeEntities=fdjtString.decodeEntities;
    var fillIn=fdjtString.fillIn;

    var getCard=metaBook.UI.getCard;
    var pagers=metaBook.pagers, mbDOM=metaBook.DOM;

    var submitEvent=fdjtUI.submitEvent;
    var noDefault=fdjt.UI.noDefault;
    var cancel=fdjt.UI.cancel;
    var noBubble=fdjt.UI.noBubble;

    var reticle=fdjtUI.Reticle;

    var setMode=metaBook.setMode;
    var setHUD=metaBook.setHUD;

    /* For tracking gestures */
    var preview_timer=false;
    function previewTimeout(fcn,interval){
        if (fcn===true)
            return preview_timer;
        else if (fcn) {
            if (preview_timer) return;
            else setTimeout(function(){preview_timer=false; fcn();},
                            interval||400);}
        else if (preview_timer) {
            clearTimeout(preview_timer);
            preview_timer=false;}
        else {}}
    metaBook.previewTimeout=previewTimeout;

    var slip_timer=false;
    function slipTimeout(fcn,interval){
        if (fcn===true)
            return slip_timer;
        else if (fcn) {
            if (slip_timer) return;
            else setTimeout(function(){slip_timer=false; fcn();},
                            interval||500);}
        else if (slip_timer) {
            clearTimeout(slip_timer);
            slip_timer=false;}
        else {}}
    metaBook.slipTimeout=slipTimeout;

    metaBook.uiclasses=/\b(metabookui|glossmark)\b/gi;

    metaBook.addConfig("controlc",function(key,val){metaBook.controlc=val;});

    /* Setup for gesture handling */

    function addHandlers(node,type){
        var mode=metaBook.ui;
        fdjtDOM.addListeners(node,mB.UI.handlers[mode][type]);}
    metaBook.UI.addHandlers=addHandlers;

    function setupGestures(domnode){
        var mode=metaBook.ui;
        if (!(mode)) metaBook.ui=mode="mouse";
        if ((!(domnode))&&((Trace.startup>1)||(Trace.gestures)))
            fdjtLog("Setting up basic handlers for %s UI",mode);
        if ((domnode)&&(Trace.gestures))
            fdjtLog("Setting up %s UI handlers for %o",mode,domnode);
        if (!(domnode)) {
            addHandlers(false,'window');
            addHandlers(document,'document');
            addHandlers(document.body,'body');
            addHandlers(metaBook.HUD,'hud');}

        if (mode) {
            var handlers=metaBook.UI.handlers[mode];
            var keys=[], seen=[];
            for (var key in handlers) {
                if ((handlers.hasOwnProperty(key))&&
                    ((key.indexOf('.')>=0)||(key.indexOf('#')>=0)))
                    keys.push(key);}
            // Appropximate sort for selector priority
            keys=keys.sort(function(kx,ky){return ky.length-kx.length;});
            var i=0, lim=keys.length;
            while (i<lim) {
                key=keys[i++];
                var nodes=fdjtDOM.$(key,domnode);
                var h=handlers[key], sel=new Selector(key);
                if ((domnode)&&(sel.match(domnode)))
                    fdjtDOM.addListeners(domnode,h);
                var j=0, jlim=nodes.length;
                while (j<jlim) {
                    var node=nodes[j++];
                    if (seen.indexOf(node)<0) { 
                        seen.push(node);
                        fdjtDOM.addListeners(node,h);}}}}
        if (Trace.startup>2) fdjtLog("Done with handler setup");}
    metaBook.setupGestures=setupGestures;

    /* Functionality:
       on selection:
       save but keep selection,
       set target (if available)
       if hud is down, raise it
       on tap: (no selection)
       if hud is down, set target and raise it
       if no target, raise hud
       if tapping target, lower HUD
       if tapping other, set target, drop mode, and raise hud
       (simpler) on tap:
       if hudup, drop it
       otherwise, set target and raise HUD
    */

    /*
      Tap on content:
      if not hudup and no mode, raise the HUD;
      if not hudup and mode, clear the mode
      if hudup, drop the HUD
      Hold on content:
      if adding gloss to target, raise the hud
      otherwise, start adding gloss to target
    */

    /* Holding */

    var held=false;

    function clear_hold(caller){
        if (held) {
            clearTimeout(held); held=false;
            if (Trace.gestures)
                fdjtLog("clear_hold from %s",(caller||"somewhere"));}}

    /* Generic content interaction handler */

    var gesture_start=false;
    var clicked=false;

    function body_tapped(evt){
        evt=evt||window.event;
        var target=fdjtUI.T(evt);
        var sX=evt.screenX, sY=evt.screenY;
        var cX=evt.clientX, cY=evt.clientY;
        var now=fdjtTime(), touch=false;
        var vw=fdjtDOM.viewWidth();

        if ((evt.changedTouches)&&(evt.changedTouches.length)) {
            touch=evt.changedTouches[0];
            sX=touch.screenX; sY=touch.screenY;
            cX=touch.clientX; cY=touch.clientY;}

        if (Trace.gestures) {
            fdjtLog("body_tapped %o c=%d,%d now=%o p=%o %s",
                    evt,cX,cY,now,mB.previewing,(touch?("(touch)"):""));}
        
        // If we're previewing, stop it and go to the page we're
        //  previewing (which was touched)
        if (mB.previewing) {
            var jumpto=getTarget(target);
            mB.stopPreview("body_tapped/stop_preview",jumpto||true);
            fdjtUI.TapHold.clear();
            cancel(evt);
            return false;}

        if (hasClass(document.body,"mbSHOWHELP")) {
            dropClass(document.body,"mbSHOWHELP");
            cancel(evt);
            return;}

        if ((mB.touch)&&(mB.textinput)) {
            mB.clearFocus(mB.textinput);
            cancel(evt);
            return;}
        
        if (mB.passage_menu) {
            if (Trace.gestures)
                fdjtLog("body_tapped %o closing menu %o",
                        evt,mB.passage_menu);
            if (mB.TapHold.body) metaBook.TapHold.body.abort();
            cancel(evt);
            return closePassageMenu(evt);}

        if (mB.skimming) {
            if (mB.hudup)
                setHUD(false,false);
            else if ((touch)&&(cX<vw/4)) 
                pageBackward(evt,true);
            else  if ((touch)&&(cX<vw/4)) 
                pageForward(evt,true);
            else setHUD(false);
            cancel(evt);
            return;}

        if (mB.glosstarget) {
            var glossform=metaBook.glossform;
            if (hasParent(target,mB.glosstarget)) {
                setMode("addgloss",false);
                cancel(evt); return;}
            else {
                metaBook.closeGlossForm(glossform);
                cancel(evt); return;}}
        
        if ((mB.hudup)||(mB.mode)) {
            setMode(false); setHUD(false);
            if ($ID("METABOOKOPENGLOSSMARK")) {
                if (mB.target)
                    metaBook.clearHighlights(mB.target);
                $ID("METABOOKOPENGLOSSMARK").id="";}
            cancel(evt); gesture_start=false;
            clicked=fdjtTime();
            // if (getTarget(target)) metaBook.setTarget(false);
            return false;}
        
        if ($ID("METABOOKOPENGLOSSMARK")) {
            $ID("METABOOKOPENGLOSSMARK").id="";
            if (mB.target) metaBook.clearHighlights(mB.target);
            cancel(evt); gesture_start=false;
            return;}

        if ((hasParent(target,".glossmark"))||
            (handle_content_click(target))) {
            cancel(evt);
            return false;}

        // If we get here, we're doing a page flip
        if (Trace.gestures)
            fdjtLog("body_tapped/fallthrough (%o) %o, m=%o, @%o,%o, vw=%o",
                    evt,target,mB.mode,cX,cY,fdjtDOM.viewWidth());
        if ((mB.fullheight)&&(!(mB.hudup))&&
            ((cY<50)||(cY>(fdjtDOM.viewHeight()-50)))) 
            setHUD(true);
        else if (cX<(fdjtDOM.viewWidth()*0.4)) 
            pageBackward(evt,true);
        else pageForward(evt,true);
        cancel(evt); gesture_start=false;
        return;}

    function resolve_anchor(ref){
        var elt=mbID(ref);
        if (elt) return elt;
        var elts=document.getElementsByName(ref);
        if (elts.length===0) return false;
        else if (elts.length===1) return elts[0];
        else {
            var found=0; var i=0, lim=elts.length;
            var metabook_page=metaBook.page;
            while (i<lim) {
                var r=elts[i++];
                if (hasClass(r,"metabookdupstart")) return r;
                else if (found) continue;
                else if (hasParent(r,metabook_page)) found=4;
                else {}}
            if (!(found)) return elts[0];
            else return found;}}

    var MetaBookSlice=metaBook.Slice;

    var note_classes=
        /\b(((sbook)|(book)|(mbook)|(metabook)|(foot)|(end)|())note)\b/;
    var noteref_classes=
        /\b((((sbook)|(book)|(meta))book)|(foot)|(end)|())(note|noteref)\b/;
    var aside_rels=/\b((sidebar)|(breakout)|(tangent))\b/;
    var iframe_rels=/\b((iframe)|(popin))\b/;
    var iframe_classes=
        /\b(()|(s)|(m)|(meta))book((iframe)|(popin))\b/;

    function handle_content_click(target){
        // Assume 1s gaps are spurious
        if ((clicked)&&((fdjtTime()-clicked)<1000)) return true;

        // Handle various click-like operations, overriding to sBook
        //  navigation where appropriate.  Set *clicked* to the
        //  current time when you do so, letting the body_click handler
        //  appropriately ignore its invocation.
        var anchor=getParent(target,"A"), href, elt=false;
        // If you tap on a relative anchor, move there using metaBook
        // rather than the browser default
        var rel=anchor.rel, classname=anchor.className;
        if (typeof classname !== "string") classname="";
        if (typeof rel !== "string") rel="";
        if ((anchor)&&(anchor.href)&&(href=anchor.getAttribute("href"))) {
            if (Trace.gestures)
                fdjtLog("ctouch: follow link %s",href);
            if (href[0]==="#") {
                var idref=href.slice(1);
                if (typeof classname !== "string") classname="";
                if (typeof rel !== "string") rel="";
                if ((rel.search(note_classes)>=0)||
                    (classname.search(noteref_classes)>=0)||
                    ((mB.noterefspecs)&&(mB.noterefspecs.match(anchor)))) {
                    var note_node=getNoteNode(idref);
                    var noteid=note_node.id;
                    metaBook.DOM.noteshud.innerHTML="";
                    var shownote=note_node.cloneNode(true);
                    fdjtDOM.stripIDs(shownote);
                    dropClass(shownote,/\bmetabook\S+/g);
                    addClass(shownote,"metabooknotebody");                
                    metaBook.DOM.noteshud.setAttribute(
                        "data-note",noteid||idref);
                    fdjtDOM.append(mbDOM.noteshud,shownote);
                    setMode("shownote");
                    gesture_start=false;
                    clicked=fdjtTime();
                    return true;}
                else if (rel.search(aside_rels)>=0) {
                    var aside_target=$ID(idref);
                    fdjtDOM.removeChildren(mbDOM.asidehud);
                    fdjtDOM.append(mbDOM.asidehud,aside_target.cloneNode(true));
                    setMode("showaside");
                    gesture_start=false;
                    clicked=fdjtTime();
                    return true;}
                else if ((metaBook.xtargets[idref])) {
                    var fn=metaBook.xtargets[idref];
                    gesture_start=false;
                    clicked=fdjtTime();
                    fn();
                    return true;}
                else if ((elt=resolve_anchor(idref))) {
                    // It's an internal jump, so we follow that
                    metaBook.JumpTo(elt);
                    gesture_start=false;
                    clicked=fdjtTime();
                    return true;}
                else {
                    fdjtLog.warn("Couldn't resolve %s",idref);
                    return true;}}
            else if ((rel.search(iframe_rels)>=0)||
                     (classname.search(iframe_classes)>=0)) {
                gesture_start=false;
                fdjtDOM.triggerClick(anchor);
                return true;}
            else {
                // We force links to leave the page, hoping people
                //  won't find it obnoxious.  We could also open up
                //  a little iframe in some circumstances
                if (!(anchor.target)) anchor.target="_blank";
                gesture_start=false;
                fdjtDOM.triggerClick(anchor);
                return true;}}

        var details=getParent(target,"details,.html5details,.sbookdetails");
        if (details) {
            fdjtDOM.removeChildren(mbDOM.notehud);
            metaBook.DOM.notehud.innerHTML=details.innerHTML;
            setMode("showdetails");
            clicked=fdjtTime();
            return true;}
        
        var aside=getParent(target,"aside,.html5aside,.sbookaside");
        if (aside) {
            fdjtDOM.removeChildren(mbDOM.asidehud);
            metaBook.DOM.asidehud.innerHTML=aside.innerHTML;
            setMode("showaside");
            clicked=fdjtTime();
            return true;}

        var glossref=getParent(target,"[data-glossid]");
        if (glossref) {
            var glossid=glossref.getAttribute("data-glossid");
            var gloss=metaBook.glossdb.ref(glossid);
            if (!(gloss)) return false;
            var slicediv=fdjtDOM("div.metabookglosses.metabookslice");
            var slice=new MetaBookSlice(slicediv,[gloss],false);
            var hudwrapper=fdjtDOM("div.hudpanel#METABOOKPOINTGLOSSES",slicediv);
            fdjtDOM.replace("METABOOKPOINTGLOSSES",hudwrapper);
            metaBook.setTarget(target);
            slice.update();
            setMode("openglossmark");
            return true;}

        return false;}

    function getNoteNode(ref){
        var elt=mbID(ref);
        var body=$ID("METABOOKBODY"), db=document.body;
        if (!(elt)) {
            var elts=document.getElementsByName(ref);
            if (!(body)) return false;
            if (elts.length) {
                var i=0, lim=elts.length; while (i<lim) {
                    if (hasParent(elt[i],body)) {elt=elt[i]; break;}
                    else i++;}}}
        if (!(elt)) return;
        var scan=elt, style=fdjtDOM.getStyle(elt), block=false;
        var notespecs=metaBook.notespecs;
        while (scan) {
            if (scan===body) break;
            else if (scan===db) break;
            else if ((notespecs)&&(notespecs.match(scan))) return scan;
            else if (block) {}
            else if (style.display==='block') {block=scan; style=false;}
            else {}
            scan=scan.parentNode;
            style=fdjtDOM.getStyle(scan);}
        if (block) return block; else return elt;}

    function jumpToNote(evt){
        evt=evt||window.event;
        var target=fdjt.UI.T(evt);
        var anchor=getParent(target,"A[href]");
        if (!(anchor)) {
            cancel(evt);
            var noteshud=mB.DOM.noteshud;
            var jumpto=noteshud.getAttribute("data-note");
            if (jumpto) {
                noteshud.removeAttribute("data-note");
                noteshud.innerHTML="";
                mB.setMode(false);
                mB.GoTo(jumpto,"jumpToNote",true,true);}
            else mB.setMode(false);}}

    function body_held(evt){
        evt=evt||window.event;
        var target=fdjtUI.T(evt);
        var passage=getTarget(target);
        if (Trace.gestures) 
            fdjtLog("body_held %o p=%o p.p=%o bc=%s hc=%s",
                    evt,passage,((passage)&&(passage.parentNode)),
                    document.body.className,
                    metaBook.HUD.className);
        if (mB.previewing) return;
        else if (hasParent(target,"A")) {
            var anchor=getParent(target,"A");
            var href=((anchor)&&(anchor.getAttribute("href")));
            cancel(evt);
            if ((href)&&(href[0]==="#")&&(mbID(href.slice(1)))) {
                if (Trace.gestures) 
                    fdjtLog("anchor_preview/body_held %o %o %o",
                            evt,anchor,href);
                mB.startPreview(href.slice(1),"content/anchor_held");
                return;}}
        if (!(passage)) return;
        if (mB.glosstarget===passage) {
            if (mB.mode!=="addgloss")
                setMode("addgloss",false);
            return;}
        if (mB.skimming) {
            cancel(evt);
            if (Trace.gestures) 
                fdjtLog("stop_skimming/body_held %o skimming=%o",
                        evt,mB.skimming);
            mB.stopSkimming();
            setHUD(false);
            mB.TapHold.body.abort();
            return;}
        mB.startSelect(passage,evt);
        mB.startAddGloss(passage,false,evt);}

    function body_taptap(evt){
        var target=fdjtUI.T(evt);
        var passage=getTarget(target);
        if (Trace.gestures) 
            fdjtLog("body_taptap %o p=%o p.p=%o bc=%s hc=%s t=%o gt=%o",
                    evt,passage,((passage)&&(passage.parentNode)),
                    document.body.className,mB.HUD.className,
                    target,mB.glosstarget);
        if (hasParent(target,"IMG,AUDIO,VIDEO,OBJECT")) {
            mB.startZoom(getParent(target,"IMG,AUDIO,VIDEO,OBJECT"));
            cancel(evt);
            return;}
        if (mB.glosstarget) {
            if (hasParent(target,mB.glosstarget)) {
                setMode("addgloss",false);}
            else metaBook.closeGlossForm();}
        if (!(passage)) return;
        if (mB.glosstarget===passage) {
            if (mB.mode!=="addgloss")
                setMode("addgloss",false);
            return;}
        var choices=[
            {label: "Add Gloss",
             classname: "addgloss",
             handler: function(){
                 mB.startGloss(passage);},
             isdefault: true}];
        /*
          if (window.ClipboardEvent) {
            choices.push({label: "Copy link",
                          handler: function(){copyURI(passage);}});
            choices.push({label: "Copy content",
                          handler: function(){copyContent(passage);}});}
        */
        choices.push(
            {label: "Zoom content",
             classname: "zoomcontent",
             handler: function(){
                 mB.startZoom(passage);
                 cancel(evt);
                 return;}});
        addOptions(passage,choices);
        if (choices.length===1) {
            cancel(evt);
            mB.startGloss(passage);
            return;}
        cancel(evt);
        choices.push(
            {label: "Cancel",
             classname: "cancel",
             handler: function(){
                 metaBook.cancelGloss();}});
        var spec={choices: choices,
                  spec: "div.fdjtdialog.metabooktaptap"};
        metaBook.passage_menu=fdjtUI.choose(spec);}

    function addOptions(passage,choices){
        var scan=passage; while (scan) {
            var link=passage.getAttribute("data-xref");
            if (link) {
                var space=link.indexOf(' ');
                var href=((space>0)?(link.slice(0,space)):(link));
                var label=((space>0)?(link.slice(space+1)):(link));
                var data={id:passage.id,docid:mB.docref,refuri:mB.refuri,
                          docuri:mB.docuri};
                if ((mB.user)&&(mB.user._id)) data.user=mB.user._id;
                var opt={label: label, handler: makeOpener(fillIn(href,data))};
                choices.push(opt);}
            scan=scan.parentNode;}
        var anchors=getChildren(passage,"a[href]");
        var i=0, lim=anchors.length; while (i<lim) {
            var anchor=anchors[i++];
            var linkref=decodeEntities(anchor.getAttribute("href"));
            var handler=((linkref.search("#")===0)?(makeGoTo(linkref)):
                         (makeOpener(anchor.href)));
            var anchor_text=fdjtDOM("span.anchortext");
            anchor_text.innerHTML=anchor.title||(anchor.innerHTML);
            var anchor_opt={handler: handler,label: anchor_text,
                            classname: "anchor"};
            choices.push(anchor_opt);}}
    
    function closePassageMenu(evt){
        evt=evt||window.event;
        if (!(mB.passage_menu)) return false;
        if (evt) {
            var target=fdjtUI.T(evt);
            if ((mB.passage_menu)&&(hasParent(target,mB.passage_menu)))
                return false;}
        var menu=mB.passage_menu;
        mB.passage_menu=false;
        fdjt.Dialog.close(menu);
        if (evt) cancel(evt);
        return true;}
    metaBook.closePassageMenu=closePassageMenu;

    function makeGoTo(href){
        return function (){metaBook.GoTo(href);};}

    function makeOpener(url){
        return function (){window.open(url);};}
    /*
    function copyURI(passage){
        var ClipboardEvent=window.ClipboardEvent;
        var evt = new ClipboardEvent(
            'copy',{ dataType: 'text/plain', 
                     data: metaBook.refuri+"#"+passage.id } );
        document.dispatchEvent(evt);}
    function copyContent(passage){
        var ClipboardEvent=window.ClipboardEvent;
        var evt = new ClipboardEvent(
            'copy',{ dataType: 'text/html', data: passage.innerHTML } );
        document.dispatchEvent(evt);}
    */

    var body_tapstart=false;
    function body_touchstart(evt){
        evt=evt||window.event;
        body_tapstart=false;
        if (mB.zoomed) return;
        var target=fdjtUI.T(evt);
        if (target.id!=="METABOOKBODY") return;
        body_tapstart=fdjtTime();}

    function body_touchend(evt){
        evt=evt||window.event;
        if (mB.zoomed) return;
        var target=fdjtUI.T(evt);
        if (target.id!=="METABOOKBODY") return;
        // If the touch is directly over the BODY, treat it as a
        // paging gesture
        if ((body_tapstart)&&((fdjtTime()-body_tapstart)<1000)) {
            if (mB.TapHold.body) metaBook.TapHold.body.abort();
            cancel(evt);
            var x=(evt.clientX)||
                ((evt.changedTouches)&&
                 (evt.changedTouches.length)&&
                 (evt.changedTouches[0].clientX));
            var w=fdjtDOM.viewWidth();
            if (x>(w/2)) pageForward(evt);
            else pageBackward(evt);}}
    
    function body_released(evt){
        evt=evt||window.event;
        if (mB.zoomed) return;
        var target=fdjtUI.T(evt), children=false;
        if (Trace.gestures) fdjtLog("body_released %o",evt);
        if (mB.previewing) {
            mB.stopPreview("body_released");
            cancel(evt);
            return;}
        else if (hasParent(target,"A")) {
            cancel(evt);
            return;}
        var passage=((hasParent(target,".fdjtselecting"))&&
                     (getTarget(target)));
        if (!(passage)) {
            children=getChildren(target,".fdjtselected");
            if (children.length===0) {
                metaBook.abortSelect(); 
                return;}
            target=children[0]; passage=getTarget(target);}
        if (Trace.gestures)
            fdjtLog("body_released %o p=%o gt=%o gf=%o",
                    evt,passage,mB.glosstarget,mB.glossform);
        if (mB.glosstarget===passage) {
            if (mB.glossform)
                metaBook.glossform.id="METABOOKLIVEGLOSS";
            if (mB.mode!=="addgloss") setMode("addgloss");}
        else mB.startAddGloss(passage,((evt.shiftKey)&&("addtag")),evt);}

    function body_swiped(evt){
        if (mB.zoomed) return;
        var dx=evt.deltaX, dy=evt.deltaY;
        var vw=fdjtDOM.viewWidth();
        var adx=((dx<0)?(-dx):(dx)), ady=((dy<0)?(-dy):(dy));
        if (Trace.gestures)
            fdjtLog("swiped d=%o,%o, ad=%o,%o, s=%o,%o vw=%o, n=%o",
                    dx,dy,adx,ady,evt.startX,evt.startY,vw,evt.ntouches);
        if (adx>(ady*1.25)) {
            // Horizontal swipe
            if (dx<-(mB.minswipe||10)) {
                if (evt.ntouches>2) window.history.forward();
                else if (evt.ntouches>1) {
                    if (mB.skimming)
                        metaBook.skimForward(evt);
                    else window.history.forward();}
                else if ((mB.mode)&&(!(mB.skimming))&&
                         (pagers[metaBook.mode])) {
                    if (evt.touches===2)
                        showPage.fastForward(pagers[metaBook.mode]);
                    else showPage.forward(pagers[metaBook.mode]);}
                else pageForward(evt,true);}
            else if (dx>(mB.minswipe||10)) {
                if (evt.ntouches>2) window.history.back();
                else if (evt.ntouches>1) {
                    if (mB.skimming)
                        metaBook.skimBackward(evt);
                    else window.history.back();}
                else if ((mB.mode)&&(!(mB.skimming))&&
                         (pagers[metaBook.mode])) {
                    if (evt.touches===2)
                        showPage.fastBckward(pagers[metaBook.mode]);
                    else showPage.backward(pagers[metaBook.mode]);}
                else pageBackward(evt,true);}}
        else if (ady>(adx*2)) {
            // Vertical swipe
            if (!(mB.hudup)) {
                if (ady<=(mB.minswipe||10)) return; // Ignore really short swipes 
                else if ((evt.startX<(vw/5))&&(dy<0))
                    // On the left, up, show help
                    setMode("help");
                else if ((evt.startX<(vw/5))&&(dy>0))
                    // On the left, down, show TOC
                    setMode("statictoc");
                else if ((evt.startX>(vw*0.8))&&(dy>0))
                    // On the right, down, show SEARCH
                    setMode("search");
                else if ((evt.startX>(vw*0.8))&&(dy<0))
                    // On the right, up, show GLOSSES
                    setMode("allglosses");
                else if ((dy>0)&&(metaBook.skimming)) {
                    mB.stopSkimming();}
                else if (dy>0) {
                    metaBook.clearStateDialog();
                    metaBook.showCover();}
                else setHUD(true);}
            else if (dy<-(mB.minswipe||10)) setMode("allglosses");
            else if (dy>(mB.minswipe||10)) setMode("search");}
        else {}}

    function initGlossMode(){
        var form=getChild("METABOOKLIVEGLOSS","form");
        if (form) {
            var input=getInput(form,"NOTE");
            if (input) metaBook.setFocus(input);
            metaBook.setGlossMode(form.className);}}
    metaBook.initGlossMode=initGlossMode;

    /* TOC handlers */

    function getAbout(elt){
        var body=document.body;
        while (elt) {
            if (elt===body) return false;
            else if (elt.nodeType!==1) return false;
            else if ((elt.name)&&(elt.name.search("SBR")===0))
                return elt;
            else if ((elt.getAttribute("name"))&&
                     (elt.getAttribute("name").search("SBR")===0))
                return elt;                     
            else elt=elt.parentNode;}
        return false;}

    function getTitleSpan(toc,ref){
        var titles=getChildren(toc,".metabooktitle");
        var i=0; var lim=titles.length;
        while (i<lim) {
            var title=titles[i++];
            if (title.name===ref) return title;}
        return false;}

    function toc_tapped(evt){
        evt=evt||window.event;
        var tap_target=fdjtUI.T(evt);
        if (mB.previewing) {
            // Because we're previewing, this slice is invisible, so
            //  the user really meant to tap on the body underneath,
            //  so we stop previewing and jump there We might try to
            //  figure out exactly which element was tapped somehow
            mB.stopPreview("toc_tapped");
            cancel(evt);
            return;}
        var about=getAbout(tap_target);
        if (about) {
            var name=about.name||about.getAttribute("name");
            var ref=name.slice(3);
            var info=metaBook.docinfo[ref];
            var target=info.elt||mbID(ref);
            if (target.id!==ref) target=mbID(ref);
            if (Trace.gestures)
                fdjtLog("toc_tapped %o about=%o ref=%s target=%o",
                        evt,about,ref,target);
            metaBook.JumpTo(target);
            cancel(evt);}
        else if (Trace.gestures) fdjtLog("toc_tapped %o noabout", evt);
        else {}}
    function toc_held(evt){
        evt=evt||window.event;
        var target=fdjtUI.T(evt), about=getAbout(target);
        previewTimeout(false); slipTimeout(false);
        if (about) {
            var name=about.name||about.getAttribute("name");
            var ref=name.slice(3);
            var toc=getParent(about,".metabooktoc");
            var title=getTitleSpan(toc,name);
            if (Trace.gestures)
                fdjtLog("toc_held %o about=%o ref=%s toc=%o title=%s",
                        evt,about,ref,toc,title);
            addClass(title,"metabookpreviewtitle");
            addClass(about.parentNode,"metabookheld");
            var spanbar=getParent(about,".spanbar")||getChild(toc,".spanbar");
            addClass(spanbar,"metabookvisible");
            addClass(toc,"metabookheld");
            mB.startPreview(mbID(ref),"toc_held");
            return cancel(evt);}
        else if (Trace.gestures) fdjtLog("toc_held %o noabout", evt);
        else {}}
    function toc_released(evt){
        evt=evt||window.event;
        var about=getAbout(fdjtUI.T(evt));
        previewTimeout(false);
        if (about) {
            var name=about.name||about.getAttribute("name");
            var ref=name.slice(3);
            var toc=getParent(about,".metabooktoc");
            var title=getTitleSpan(toc,name);
            if (Trace.gestures)
                fdjtLog("toc_released %o ref=%o about=%o toc=%o title=%s",
                        evt,ref,about,toc,title);
            dropClass(title,"metabookpreviewtitle");
            dropClass(about.parentNode,"metabookheld");
            var spanbar=getParent(about,".spanbar")||getChild(toc,".spanbar");
            dropClass(spanbar,"metabookvisible");
            dropClass(toc,"metabookheld");
            if (mB.previewing)
                mB.stopPreview("toc_released");}
        else if (Trace.gestures) {
            fdjtLog("toc_released %o noabout",evt);
            mB.stopPreview("toc_released");}
        else {
            mB.stopPreview("toc_released");}
        cancel(evt);}
    function toc_touchtoo(evt){
        evt=evt||window.event;
        previewTimeout(false);
        if (!(mB.previewing)) return;
        else if (Trace.gestures) {
            fdjtLog("toc_touchtoo %o noabout",evt);
            mB.stopPreview("toc_touchtoo",true);}
        else {
            mB.stopPreview("toc_touchtoo",true);}
        cancel(evt);}
    function toc_slipped(evt){
        evt=evt||window.event;
        if (slip_timer) return;
        slipTimeout(function(){
            slip_timer=false;
            if (Trace.gestures)
                fdjtLog("toc_slipped/timeout %o",evt);
            mB.stopPreview("toc_slipped");});}

    /* Highlighting terms in passages (for skimming, etc) */

    var wordRegExp=fdjtDOM.wordRegExp;

    function highlightTerm(term,target,info,spellings){
        var words=[]; var highlights=[];
        if (typeof term === 'string')
            words=((spellings)&&(spellings[term]))||[term];
        else {
            var knodes=info.knodes;
            if (!(knodes)) knodes=[];
            else if (!(knodes instanceof Array)) knodes=[knodes];
            var i=0; var lim=knodes.length;
            while (i<lim) {
                var knode=knodes[i++];
                if ((knode===term)||(RefDB.contains(knode.allways,term))) {
                    var qid=knode._qid; var dterm=knode.dterm;
                    var spelling=
                        ((spellings)&&
                         ((spellings[qid])||(spellings[dterm])));
                    if (!(spelling)) {
                        var synonyms=knode.EN;
                        if (!(synonyms)) {}
                        else if (typeof synonyms === 'string')
                            words.push(synonyms);
                        else words=words.concat(synonyms);
                        var hooks=knode.hooks;
                        if (!(hooks)) {}
                        else if (typeof hooks === 'string')
                            words.push(hooks);
                        else words=words.concat(hooks);}
                    else if (typeof spelling === 'string')
                        words.push(spelling);
                    else words=words.concat(spelling);}}
            if (words.length===0) words=false;}
        if (!(words)) return [];
        if (typeof words === 'string') words=[words];
        var j=0; var jlim=words.length;
        while (j<jlim) {
            var word=words[j++];
            var pattern=wordRegExp(word);
            var dups=metaBook.getDups(target);
            var ranges=fdjtDOM.findMatches(dups,pattern);
            if (!((ranges)&&(ranges.length))) {
                pattern=wordRegExp(word,true);
                ranges=fdjtDOM.findMatches(dups,pattern);}
            if (Trace.highlight)
                fdjtLog("Trying to highlight %s (using %o) in %o, ranges=%o",
                        word,pattern,target,ranges);
            if ((ranges)&&(ranges.length)) {
                var k=0; while (k<ranges.length) {
                    var h=fdjtUI.Highlight(
                        ranges[k++],"mbhighlightsearch");
                    highlights=highlights.concat(h);}}}
        return highlights;}
    metaBook.highlightTerm=highlightTerm;

    /* Keyboard handlers */

    // We use keydown to handle navigation functions and keypress
    //  to handle mode changes
    function mb_onkeydown(evt){
        evt=evt||window.event||null;
        var kc=evt.keyCode;
        var target=fdjtUI.T(evt);
        if (evt.keyCode===27) { /* Escape works anywhere */
            if (mB.previewing) {
                mB.stopPreview("escape_key");
                fdjtUI.TapHold.clear();}
            dropClass(document.body,"mbZOOM");
            dropClass(document.body,"mbMEDIA");
            mB.zoomed=false;
            if (mB.mode==="addgloss") metaBook.cancelGloss();
            if (mB.mode) {
                metaBook.last_mode=metaBook.mode;
                setMode(false);
                metaBook.setTarget(false);
                $ID("METABOOKSEARCHINPUT").blur();}
            else {}
            return;}
        else if ((target.tagName==="TEXTAREA")||
                 (target.tagName==="INPUT")||
                 (target.tagName==="BUTTON")||
                 (target.isContentEditable))
            return;
        if (Trace.gestures)
            fdjtLog("metabook_keydown %o: %o on %o",evt,kc,target);
        if ((mB.controlc)&&(evt.ctrlKey)&&((kc===99)||(kc===67))) {
            if (mB.previewing) mB.stopPreview("mb_onkeydown",true);
            fdjtUI.TapHold.clear();
            setMode("console");
            cancel(evt);}
        else if ((evt.altKey)||(evt.ctrlKey)||(evt.metaKey)) return true;
        else if (mB.previewing) {
            // Any key stops a preview and goes to the target
            mB.stopPreview("mb_onkeydown",true);
            fdjtUI.TapHold.clear();
            setHUD(false);
            cancel(evt);
            return false;}
        else if (hasClass(document.body,"mbCOVER")) {
            metaBook.clearStateDialog();
            metaBook.hideCover();
            cancel(evt);
            return false;}
        else if (hasClass(document.body,"mbZOOM")) {
            if (kc===34) fdjtDOM.pageScroll($ID("METABOOKZOOM"),1);
            else if (kc===33) fdjtDOM.pageScroll($ID("METABOOKZOOM"),-1);
            else {}
            return false;}
        else if (mB.glossform) {
            var input=fdjt.DOM.getInput(mB.glossform,"NOTE");
            metaBook.UI.glossFormFocus(mB.glossform);
            metaBook.setFocus(input); input.focus();
            var new_evt=document.createEvent("UIEvent");
            new_evt.initUIEvent("keydown",true,true,window);
            new_evt.keyCode=kc;
            input.dispatchEvent(new_evt);
            cancel(evt);
            return;}
        else if (kc===34) pageForward(evt);   /* page down */
        else if (kc===33) pageBackward(evt);  /* page up */
        else if (kc===40) { /* arrow down */
            setHUD(false);
            pageForward(evt);}
        else if (kc===38) {  /* arrow up */
            setHUD(false);
            pageBackward(evt);}
        else if (kc===37) {  /* arrow left */
            if ((mB.mode)&&(!(mB.skimming))&&
                (pagers[metaBook.mode]))
                showPage.fastBackward(pagers[metaBook.mode]);                
            else metaBook.skimBackward(evt);}
        else if (kc===39) {  /* arrow right */
            if ((mB.mode)&&(!(mB.skimming))&&
                (pagers[metaBook.mode]))
                showPage.fastForward(pagers[metaBook.mode]);                
            else metaBook.skimForward(evt);}
        // Don't interrupt text input for space, etc
        else if (fdjtDOM.isTextInput(fdjtDOM.T(evt))) return true;
        else if (kc===32) { // Space
            if ((mB.mode)&&(!(mB.skimming))&&
                (pagers[metaBook.mode])) {
                if (evt.shiftKey)
                    showPage.fastForward(pagers[metaBook.mode]);
                else showPage.forward(pagers[metaBook.mode]);}
            else pageForward(evt,true);}
        else if ((kc===8)||(kc===45)) { // backspace or delete
            if ((mB.mode)&&(!(mB.skimming))&& (pagers[metaBook.mode])) {
                if (evt.shiftKey)
                    showPage.fastBackward(pagers[metaBook.mode]);
                else showPage.backward(pagers[metaBook.mode]);}
            else pageBackward(evt,true);}
        // Home goes to the current head.
        else if (kc===36) metaBook.JumpTo(mB.head);
        else if (mB.mode==="addgloss") {
            var mode=metaBook.getGlossMode();
            if (mode) return;
            var formdiv=$ID("METABOOKLIVEGLOSS");
            var form=(formdiv)&&(getChild(formdiv,"FORM"));
            if (!(form)) return;
            if (kc===13) { // return/newline
                submitEvent(form);}
            else if ((kc===35)||(kc===91)) // # or [
                metaBook.setGlossMode("addtag",form);
            else if (kc===32) // Space
                metaBook.setGlossMode("editnote",form);
            else if ((kc===47)||(kc===58)) // /or :
                metaBook.setGlossMode("attach",form);
            else if ((kc===64)) // @
                metaBook.setGlossMode("addoutlet",form);
            else {}}
        else return;
        cancel(evt);}

    // At one point, we had the shift key temporarily raise/lower the HUD.
    //  We might do it again, so we keep this definition around
    function mb_onkeyup(evt){
        evt=evt||window.event||null;
        if (fdjtDOM.isTextInput(fdjtDOM.T(evt))) return true;
        else if ((evt.ctrlKey)||(evt.altKey)||(evt.metaKey)) return true;
        else {}}
    metaBook.UI.handlers.onkeyup=mb_onkeyup;

    /* Keypress handling */

    // We have a big table of command characters which lead to modes
    var modechars={
        63: "searching",102: "searching",
        65: "openheart", 97: "openheart",
        83: "searching",115: "searching",
        80: "gotopage",112: "gotopage",
        76: "gotoloc",108: "gotoloc",
        70: "searching",
        100: "device",68: "device",
        116: "statictoc",84: "statictoc", 72: "help", 
        103: "allglosses",71: "allglosses",
        67: "console", 99: "console"};

    // Handle mode changes
    function mb_onkeypress(evt){
        var modearg=false; 
        evt=evt||window.event||null;
        var ch=evt.charCode||evt.keyCode;
        var target=fdjtDOM.T(evt);
        if (fdjtDOM.isTextInput(target)) return true;
        else if ((evt.altKey)||(evt.ctrlKey)||(evt.metaKey)) return true;
        if (Trace.gestures)
            fdjtLog("metabook_onkeypress %o: %o on %o",evt,ch,target);
        if ((ch===72)||(ch===104)) { // 'H' or 'h'
            metaBook.clearStateDialog();
            metaBook.hideCover();
            fdjtDOM.toggleClass(document.body,'metabookhelp');
            return false;}
        else if ((ch===67)||(ch===99)) { // 'C' or 'c'
            metaBook.clearStateDialog();
            metaBook.toggleCover();
            return false;}
        else if (hasClass(document.body,"mbZOOM")) {
            if (ch===43) /*+*/ { return mB.zoom(1.1);}
            else if (ch===45) /*-*/ {return mB.zoom(0.9);}
            else modearg=modechars[ch];}
        else modearg=modechars[ch];
        if (modearg==="openheart")
            modearg=metaBook.last_heartmode||"about";
        var mode=setMode();
        if (modearg) {
            if (mode===modearg) {
                setMode(false); mode=false;}
            else {
                setMode(modearg); mode=modearg;}}
        else {}
        if (mode==="searching")
            metaBook.setFocus($ID("METABOOKSEARCHINPUT"));
        else metaBook.clearFocus($ID("METABOOKSEARCHINPUT"));
        fdjtDOM.cancel(evt);}
    metaBook.UI.handlers.onkeypress=mb_onkeypress;

    function goto_keypress(evt){
        evt=evt||window.event||null;
        var target=fdjtUI.T(evt);
        var ch=evt.charCode||evt.keyCode;
        var max=false; var min=false;
        var handled=false;
        if (target.name==='GOTOLOC') {
            min=0; max=Math.floor(mB.ends_at/128);}
        else if (target.name==='GOTOPAGE') {
            min=1; max=metaBook.pagecount;}
        else if (ch===13) cancel(evt);
        if (ch===13) {
            if (target.name==='GOTOPAGE') {
                var num=parseInt(target.value,10);
                if (typeof num === 'number') {
                    handled=true; metaBook.GoToPage(num);}
                else if (isEmptyString(target.value))
                    handled=true;
                else {}}
            else if (target.name==='GOTOREF') {
                var pagemap=metaBook.layout.pagemap;
                var page=pagemap[target.value];
                if (page) {
                    metaBook.GoToPage(page); handled=true;}
                else if (isEmptyString(target.value))
                    handled=true;
                else {}}
            else if (target.name==='GOTOLOC') {
                var locstring=target.value;
                var loc=parseFloat(locstring);
                if ((typeof loc === 'number')&&(loc>=0)&&(loc<=100)) {
                    loc=Math.floor((loc/100)*metaBook.ends_at)+1;
                    metaBook.JumpTo(loc); handled=true;}
                else if (isEmptyString(target.value))
                    handled=true;
                else {}}
            else {}
            if (handled) {
                target.value="";
                setMode(false);}}}
    metaBook.UI.goto_keypress=goto_keypress;

    /* HUD button handling */

    function hudmodebutton(evt){
        evt=evt||window.event;
        var target=fdjtUI.T(evt);
        var mode=target.getAttribute("hudmode");
        if (Trace.gestures)
            fdjtLog("hudmodebutton() %o mode=%o cl=%o skim=%o sbh=%o mode=%o",
                    evt,mode,(isClickable(target)),
                    metaBook.skimpoint,mB.hudup,mB.setMode());
        metaBook.clearStateDialog();
        if (reticle.live) reticle.flash();
        cancel(evt);
        if (!(mode)) return;
        var mode_live=(hasClass(mB.HUD,mode))||
            ((mode==="search")&&(hasClass(mB.HUD,mB.searchModes)));
        if ((evt.type==='click')||
            (evt.type==='tap')||
            (evt.type==='release')) {
            dropClass(document.body,"_HOLDING");
            if ((mB.skimpoint)&&(!(mB.hudup))) {
                if (mB.skimming) mB.stopSkimming();
                if ((mode==="refinesearch")||(mode==="searchresults")) {
                    setMode("searchresults"); return;}
                else if (mode==="allglosses") {
                    setMode("allglosses"); return;}
                else if (mode==="statictoc") {
                    setMode("statictoc"); return;}}
            if (mode_live) {
                if (hasClass(document.body,"mbSKIMMING"))
                    mB.stopSkimming();
                else setMode(false,true);}
            else {
                if (hasClass(document.body,"mbSKIMMING"))
                    mB.stopSkimming();
                setMode(mode);}}
        else if (evt.type==="hold") 
            addClass(document.body,"_HOLDING");
        else dropClass(document.body,"_HOLDING");
    }
    metaBook.UI.hudmodebutton=hudmodebutton;

    metaBook.UI.dropHUD=function(evt){
        var target=fdjtUI.T(evt);
        if (isClickable(target)) {
            if (Trace.gestures)
                fdjtLog("Clickable: don't dropHUD %o",evt);
            return;}
        if (Trace.gestures) fdjtLog("dropHUD %o",evt);
        cancel(evt); setMode(false);};

    /* Glossmarks */
    
    function glossmark_tapped(evt){
        evt=evt||window.event||null;
        if (held) clear_hold("glossmark_tapped");
        if ((evt.ctrlKey)||(evt.altKey)||(evt.metaKey)||(evt.shiftKey))
            return;
        var target=fdjtUI.T(evt);
        var glossmark=getParent(target,".glossmark");
        var passage=
            ((glossmark.name)&&
             (glossmark.name.search("GLOSSMARK_NAME_")===0)&&
             ($ID(glossmark.name.slice(15))))||
            getTarget(glossmark.parentNode,true);
        if ((passage)&&(passage.getAttribute("data-baseid"))) 
            passage=mbID(passage.getAttribute("data-baseid"));
        if (Trace.gestures)
            fdjtLog("glossmark_tapped (%o) on %o gmark=%o passage=%o mode=%o target=%o",
                    evt,target,glossmark,passage,mB.mode,mB.target);
        if (!(glossmark)) return false;
        cancel(evt);
        if ((mB.mode==='openglossmark')&&
            (mB.target===passage)) {
            setMode(false);
            metaBook.clearGlossmark();
            return;}
        else if (mB.select_target) return;
        else metaBook.showGlossmark(passage,glossmark);}

    var animated_glossmark=false;
    var glossmark_animated=false;
    var glossmark_image=false;
    function animate_glossmark(target,enable){
        if ((target)&&(enable)) {
            var glossmark=((hasClass(target,"glossmark"))?(target):
                           (getParent(target,".glossmark")));
            if (!(glossmark)) return;
            if (animated_glossmark===glossmark) return;
            if (glossmark_animated) {
                clearInterval(glossmark_animated);
                animated_glossmark=false;
                glossmark_animated=false;
                if (glossmark_image)
                    fdjtUI.ImageSwap.reset(glossmark_image);}
            var wedge=getChild(glossmark,"img.wedge");
            if (!(wedge)) return;
            animated_glossmark=glossmark;
            glossmark_image=wedge;
            glossmark_animated=fdjtUI.ImageSwap(wedge,750);}
        else {
            if (glossmark_animated) {
                clearInterval(glossmark_animated);
                animated_glossmark=false;
                glossmark_animated=false;
                if (glossmark_image)
                    fdjtUI.ImageSwap.reset(glossmark_image);
                glossmark_image=false;}}}

    function glossmark_hoverstart(evt){
        evt=evt||window.event;
        var target=fdjtUI.T(evt);
        var passage=getTarget(target);
        if (!(fdjtDOM.hasClass(passage,"mbtarget")))
            animate_glossmark(target,true);}

    function glossmark_hoverdone(evt){
        evt=evt||window.event;
        var target=fdjtUI.T(evt);
        var passage=getTarget(target);
        if (!(fdjtDOM.hasClass(passage,"mbtarget")))
            animate_glossmark(target,false);}

    function setTargetUI(target){
        if (target) {
            var glossmark=getChild(target,".glossmark");
            if (glossmark) animate_glossmark(glossmark,true);
            else animate_glossmark(false,false);}
        else animate_glossmark(false,false);}
    metaBook.UI.setTarget=setTargetUI;

    /* Various actions */

    function forceSyncAction(evt){
        evt=evt||window.event;
        cancel(evt);
        metaBook.forceSync();
        if (!(navigator.onLine))
            fdjtUI.alertFor(
                15,"You're currently offline; information will be synchronized when you're back online");
        else if (!(mB.connected))
            fdjtUI.alertFor(
                15,"You're not currently logged into sBooks.  Information will be synchronized when you've logged in.");
        else fdjtUI.alertFor(7,"Sychronizing glosses, etc with the remote server");
        return false;}
    metaBook.UI.forceSyncAction=forceSyncAction;


    /* Moving forward and backward */

    var last_motion=false;

    function forward(evt){
        if (!(evt)) evt=window.event||false;
        if (evt) cancel(evt);
        if (Trace.nav)
            fdjtLog("Forward e=%o h=%o t=%o",evt,
                    metaBook.head,mB.target);
        if (mB.skimming)
            skimForward(evt);
        else if ((mB.mode)&&(pagers[metaBook.mode]))
            showPage.forward(pagers[metaBook.mode]);
        else if ((evt)&&(evt.shiftKey))
            skimForward(evt);
        else pageForward(evt);}
    metaBook.Forward=forward;
    function backward(evt){
        if (!(evt)) evt=window.event||false;
        if (evt) cancel(evt);
        if (Trace.nav)
            fdjtLog("Backward e=%o h=%o t=%o",evt,
                    metaBook.head,mB.target);
        if (mB.skimming)
            skimBackward(evt);
        else if ((mB.mode)&&(pagers[metaBook.mode]))
            showPage.backward(pagers[metaBook.mode]);
        else if ((evt)&&(evt.shiftKey))
            skimBackward();
        else pageBackward();}
    metaBook.Backward=backward;

    function preview_touchmove_nodefault(evt){
        if (mB.previewing) fdjtUI.noDefault(evt);}

    function pageForward(evt,clearmodes){
        evt=evt||window.event;
        dropClass(document.body,/\bmb(PAGE)?PREVIEW/g);
        var now=fdjtTime();
        if ((last_motion)&&((now-last_motion)<100)) return;
        else last_motion=now;
        dropClass(document.body,/\bmb(PAGE)?PREVIEW/g);
        if ((clearmodes)&&((mB.hudup)||(mB.mode)))
            fdjt.Async(function(){mB.setHUD(false);});
        else {}
        if (mB.readsound)
            fdjtDOM.playAudio("METABOOKPAGEORWARDAUDIO");
        if ((Trace.gestures)||(Trace.flips))
            fdjtLog("pageForward (on %o) c=%o n=%o",
                    evt,mB.curpage,mB.pagecount);
        if ((mB.bypage)&&(typeof metaBook.curpage === "number")) {
            var pagemax=((mB.bypage)&&
                         ((mB.pagecount)||(mB.layout.pagenum-1)));
            var newpage=false;
            if (mB.curpage>=pagemax) {}
            else metaBook.GoToPage(
                newpage=metaBook.curpage+1,"pageForward",true,true);}
        else {
            var delta=fdjtDOM.viewHeight()-50;
            if (delta<0) delta=fdjtDOM.viewHeight();
            var newy=fdjtDOM.viewTop()+delta;
            window.scrollTo(fdjtDOM.viewLeft(),newy);}}
    metaBook.pageForward=pageForward;

    function pageBackward(evt,clearmodes){
        var now=fdjtTime();
        dropClass(document.body,/\bmb(PAGE)?PREVIEW/g);
        if ((last_motion)&&((now-last_motion)<100)) return;
        else last_motion=now;
        evt=evt||window.event;
        if (clearmodes) fdjt.Async(function(){mB.setHUD(false);});
        else {}
        if (mB.readsound)
            fdjtDOM.playAudio("METABOOKPAGEBACKWARDAUDIO");
        if ((Trace.gestures)||(Trace.flips))
            fdjtLog("pageBackward (on %o) c=%o n=%o",
                    evt,mB.curpage,mB.pagecount);
        if ((mB.bypage)&&(typeof metaBook.curpage === "number")) {
            var newpage=false;
            if (mB.curpage===0) {}
            else {
                newpage=metaBook.curpage-1;
                metaBook.GoToPage(newpage,"pageBackward",true,true);}}
        else {
            var delta=fdjtDOM.viewHeight()-50;
            if (delta<0) delta=fdjtDOM.viewHeight();
            var newy=fdjtDOM.viewTop()-delta;
            window.scrollTo(fdjtDOM.viewLeft(),newy);}}
    metaBook.pageBackward=pageBackward;

    function skimForward(evt){
        var now=fdjtTime(), slice=metaBook.slices[metaBook.mode];
        if ((Trace.gestures)||(Trace.nav))
            fdjtLog("skimForward %o: mode=%s",evt,mB.mode);
        dropClass(document.body,/\bmb(PAGE)?PREVIEW/g);
        if ((last_motion)&&((now-last_motion)<100)) return;
        else last_motion=now;
        if (mB.uisound)
            fdjtDOM.playAudio("METABOOKSKIMFORWARDAUDIO");
        if (!(slice)) return;
        if (mB.uisound)
            fdjtDOM.playAudio("METABOOKSKIMFORWARDAUDIO");
        addClass("METABOOKSKIMMER","flash");
        addClass("METABOOKNEXTSKIM","flash");
        setTimeout(function(){
            dropClass("METABOOKSKIMMER","flash");
            dropClass("METABOOKNEXTSKIM","flash");},
                   200);
        var next=slice.forward();
        if (next) metaBook.SkimTo(next,1);
        return next;}
    metaBook.skimForward=skimForward;

    function skimBackward(evt){
        var now=fdjtTime(), slice=metaBook.slices[metaBook.mode];
        if ((Trace.gestures)||(Trace.nav))
            fdjtLog("skimBackward %o: mode=%s",evt,mB.mode);
        dropClass(document.body,/\bmb(PAGE)?PREVIEW/g);
        if ((last_motion)&&((now-last_motion)<100)) return;
        else last_motion=now;
        if (mB.uisound)
            fdjtDOM.playAudio("METABOOKSKIMBACKWARDAUDIO");
        if (!(slice)) return;
        addClass("METABOOKPREVSKIM","flash");
        addClass("METABOOKSKIMMER","flash");
        setTimeout(function(){
            dropClass("METABOOKSKIMMER","flash");
            dropClass("METABOOKPREVSKIM","flash");},
                   200);
        var next=slice.backward();
        if (next) metaBook.SkimTo(next,-1);
        return next;}
    metaBook.skimBackward=skimBackward;

    /* Idea for new skimmer rules:
       Skimming with the hud up leaves the skimmer expanded
       By default, skimming starts with the hudup
       Tap on the skimmer raises the hud if it's not up, returns to the slice
         if it is.
       Tap on the body when skimming with the hud up drops the hud.
    */

    function skimmer_tapped(evt){
        evt=evt||window.event;
        var target=fdjtUI.T(evt);
        if (isClickable(target)) return;
        if ((getParent(target,".tool"))) {
            var card=getCard(target);
            if ((card)&&((card.name)||(card.getAttribute("name")))) {
                var name=(card.name)||(card.getAttribute("name"));
                var gloss=RefDB.resolve(name,mB.glossdb);
                if (!(gloss)) return;
                var form=metaBook.setGlossTarget(gloss);
                if (!(form)) return;
                mB.stopSkimming();
                setMode("addgloss");
                return;}
            else return;}
        if (getParent(target,".mbmedia")) {
            var link=getParent(target,".mbmedia");
            var src=link.getAttribute("data-src"), cancelling=false;
            var type=link.getAttribute("data-type");
            if (hasClass(link,"imagelink")) {
                metaBook.showMedia(src,type); cancelling=true;}
            else if ((hasClass(link,"audiolink"))||
                     (hasClass(link,"musiclink"))) {
                metaBook.showMedia(src,type); cancelling=true;}
            else {}
            if (cancelling) {
                cancel(evt);
                return;}}
        if (getParent(target,"mbcard_tochead")) {
            var anchor=getParent(target,".tocref");
            var href=(anchor)&&(anchor.getAttribute("data-tocref"));
            if (href) metaBook.GoTOC(href);
            else toggleClass("METABOOKSKIMMER","expanded");
            return;}
        if (mB.hudup) mB.stopSkimming();
        else setHUD(true,false);
        cancel(evt);
        return;}

    function skimmer_swiped(evt){
        var dx=evt.deltaX, dy=evt.deltaY;
        var vw=fdjtDOM.viewWidth();
        var adx=((dx<0)?(-dx):(dx)), ady=((dy<0)?(-dy):(dy));
        if (Trace.gestures)
            fdjtLog("skimmer_swiped d=%o,%o, ad=%o,%o, s=%o,%o vw=%o, n=%o",
                    dx,dy,adx,ady,evt.startX,evt.startY,vw,evt.ntouches);
        if (adx>(ady*2)) {
            // Horizontal swipe
            if (dx<-(mB.minswipe||10))
                metaBook.skimForward(evt);
            else if (dx>(mB.minswipe||10))
                metaBook.skimBackward(evt);
            else {/* Ignored */}}
        else if (ady>(adx*2)) {
            // Vertical swipe
            if (ady<=(mB.minswipe||10)) return;
            else if (dy<0) mB.setHUD(false);
            else mB.stopSkimming();}
        else {}
        cancel(evt);}

    /* Entering page numbers and locations */

    function enterPageNum(evt) {
        evt=evt||window.event;
        if ((mB.hudup)||(mB.mode)||(mB.cxthelp)) {
            cancel(evt);
            setMode(false);
            return;}
        cancel(evt);
        if (mB.hudup) {setMode(false); return;}
        setMode("gotopage",true);}
    function enterPageRef(evt) {
        evt=evt||window.event;
        if ((mB.hudup)||(mB.mode)||(mB.cxthelp)) {
            cancel(evt);
            setMode(false);
            return;}
        cancel(evt);
        if (mB.hudup) {setMode(false); return;}
        setMode("gotoref",true);}
    function enterLocation(evt) {
        evt=evt||window.event;
        if ((mB.hudup)||(mB.mode)||(mB.cxthelp)) {
            cancel(evt);
            setMode(false);
            return;}
        cancel(evt);
        if (mB.hudup) {setMode(false); return;}
        setMode("gotoloc",true);}
    function enterPercentage(evt) {
        evt=evt||window.event;
        if ((mB.hudup)||(mB.mode)||(mB.cxthelp)) {
            cancel(evt);
            setMode(false);
            return;}
        cancel(evt);
        if (mB.hudup) {setMode(false); return;}
        setMode("gotoloc",true);}
    
    /* Other handlers */

    function flyleaf_tap(evt){
        if (isClickable(evt)) return;
        else setMode(false);}

    function head_tap(evt){
        evt=evt||window.event;
        var target=fdjtUI.T(evt);
        if (Trace.gestures) fdjtLog("head_tap %o t=%o",evt,target);
        if (mB.previewing) {
            mB.stopPreview("head_tap");
            cancel(evt);
            return;}
        if (fdjtUI.isClickable(target))
            return default_tap(evt);
        if (!((target===metaBook.DOM.head)||
              (target===metaBook.DOM.tabs)))
            return;
        else if (mB.mode) {
            cancel(evt);
            setMode(false);}
        else if (fdjtDOM.hasClass(document.body,"mbSHOWHELP")) {
            cancel(evt);
            dropClass(document.body,"mbSHOWHELP");}
        else if (mB.hudup) {
            cancel(evt);
            setMode(false);}
        else {
            cancel(evt);
            setMode(true);}}
    function foot_tap(evt){
        if (Trace.gestures) fdjtLog("foot_tap %o",evt);
        if (mB.previewing) {
            mB.stopPreview("foot_tap");
            cancel(evt);
            return;}
        if ((isClickable(evt))||(hasParent(fdjtUI.T(evt),"hudbutton")))
            return;
        else if ((mB.hudup)||(mB.mode)||(mB.cxthelp)) {
            cancel(evt);
            setMode(false);
            return;}}

    /* Back to the text */

    function back_to_reading(evt){
        evt=evt||window.event;
        cancel(evt);
        if (mB.mode==="addgloss") 
            metaBook.cancelGloss();
        setMode(false);
        dropClass(document.body,"mbSHOWHELP");}

    function clearMode(evt){
        evt=evt||window.event; setMode(false);}

    /* Tracking text input */

    function setFocus(target){
        if (!(target)) {
            var cur=metaBook.textinput;
            metaBook.textinput=false;
            metaBook.freezelayout=false;
            if (cur) cur.blur();
            return;}
        else if (mB.textinput===target) return;
        else {
            metaBook.textinput=target;
            metaBook.freezelayout=true;
            target.focus();}}
    metaBook.setFocus=setFocus;
    function clearFocus(target){
        if (!(target)) target=metaBook.textinput;
        if ((target)&&(mB.textinput===target)) {
            metaBook.textinput=false;
            metaBook.freezelayout=false;
            target.blur();}}
    metaBook.clearFocus=clearFocus;

    function mb_onfocus(evt){
        evt=evt||window.event;
        var target=fdjtUI.T(evt);
        var input=getParent(target,'textarea');
        if (!(input)) input=getParent(target,'input');
        if ((!(input))||(typeof input.type !== "string")||
            (input.type.search(fdjtDOM.text_types)!==0))
            return;
        setFocus(input);}
    metaBook.UI.focus=mb_onfocus;
    function mb_onblur(evt){
        evt=evt||window.event;
        var target=((evt.nodeType)?(evt):(fdjtUI.T(evt)));
        var input=getParent(target,'textarea');
        if ((metaBook.previewing)&&(target===window))
            mB.stopPreview();
        if (!(input)) input=getParent(target,'input');
        if ((!(input))||(typeof input.type !== "string")||
            (input.type.search(fdjtDOM.text_types)!==0))
            return;
        clearFocus(input);}
    metaBook.UI.blur=mb_onblur;

    function metabookmouseout(evt){
        var target=fdjtUI.T(evt);
        if ((target===window)||(target===document.documentElement)) {
            if (metaBook.previewing) mB.stopPreview();}}

    function metabookvischange(evt){
        evt=evt||window.event;
        if (document[fdjtDOM.isHidden]) {
            if (metaBook.previewing) mB.stopPreview();}}

    /* Rules */

    
    function setHelp(flag){
        if (flag) {
            addClass(document.body,"mbSHOWHELP");
            metaBook.cxthelp=true;}
        else {
            dropClass(document.body,"mbSHOWHELP");
            metaBook.cxthelp=false;}
        return false;}
    metaBook.setHelp=setHelp;
    
    function toggleHelp(evt){
        evt=evt||window.event;
        if (Trace.gestures) fdjtLog("toggleHelp %o",evt);
        cancel(evt);
        if (mB.cxthelp) {
            dropClass(document.body,"mbSHOWHELP");
            metaBook.cxthelp=false;}
        else {
            addClass(document.body,"mbSHOWHELP");
            metaBook.cxthelp=true;}
        return false;}
    metaBook.toggleHelp=toggleHelp;

    function default_tap(evt){
        evt=evt||window.event;
        var target=fdjtUI.T(evt);
        if ((target.tagName==="TEXTAREA")||
            ((target.tagName==="INPUT")&&
             (target.type.search(fdjtDOM.text_input_types)>=0))) {
            target.focus();
            noBubble(evt);}
        else if ((target.tagName==="A")&&(target.href)) {
            var href=target.href;
            if (href[0]==='#') {
                var id=href.slice(1), xt=mB.xtargets[id], elt;
                if (xt) {cancel(evt); xt();}
                else if ((elt=(mB.ID(id)))) {
                    cancel(evt); fdjtAsync(function(){mB.GoTo(elt);});}
                else {}}
            else if ((mB.xrules)&&(mB.xrules.length>0)) {
                var xrules=mB.xrules, r=0, nrules=xrules.length;
                while (r<nrules) {
                    var rule=xrules[r++];
                    if ((href.search(rule.pattern)>=0)&&
                        (rule.handler(href,target)))
                        break;}}
            else {}}
        else {}}

    function dombody_touched(evt){
        if ((mB.hudup)||(mB.closed)) return;
        else {
            var touches=((evt.touches)&&(evt.touches.length)&&(evt.touches))||
                ((evt.changedTouches)&&(evt.changedTouches.length)&&(evt.changedTouches));
            var x=evt.clientX||((touches)&&(touches[0].clientX));
            var y=evt.clientY||((touches)&&(touches[0].clientY));
            var elt=((x)||(y))&&(document.elementFromPoint(x,y));
            if (mB.Trace.gestures>1)
                fdjtLog("dombody_touched %o: %o @ <%o,%o>",evt,elt,x,y);
            if ((elt!==document.body)&&(hasParent(elt,document.body))) return;
            if ((elt.offsetHeight)&&((y<50)||((elt.offsetHeight-y)<50))) return;
            if (mB.Trace.gestures)
                fdjtLog("dombody_touched(atedge) %o: %o @ <%o,%o>",evt,elt,x,y);
            if (x<25) return backward(evt);
            else if ((elt.offsetWidth-x)<25)
                return forward(evt);
            else return;}}
    metaBook.dombody_touched=dombody_touched;

    function showcover_tapped(evt){
        evt=evt||window.event;
        if ((mB.touch)&&(!(mB.hudup))) return;
        if (!((evt.shiftKey)||((evt.touches)&&(evt.touches.length>=2)))) {
            var opened=
                metaBook.readLocal(
                    "mB("+mB.docid+").opened",
                    true);
            if ((opened)&&((opened-fdjtTime())>(60*10*1000))) {
                if ($ID("METABOOKCOVERHOLDER"))
                    $ID("METABOOKCOVER").className="bookcover";
                else $ID("METABOOKCOVER").className="titlepage";}}
        metaBook.clearStateDialog();
        metaBook.showCover();
        cancel(evt);}
    function showcover_released(evt){
        evt=evt||window.event;
        if (!((evt.shiftKey)||((evt.touches)&&(evt.touches.length>=2))))
            $ID("METABOOKCOVER").className="bookcover";
        metaBook.clearStateDialog();
        metaBook.showCover();
        cancel(evt);}

    function global_mouseup(evt){
        evt=evt||window.event;
        if (mB.zoomed) return;
        if (mB.page_turner) {
            clearInterval(mB.page_turner);
            metaBook.page_turner=false;
            return;}
        if (mB.select_target) {
            mB.startAddGloss(
                metaBook.select_target,
                ((evt.shiftKey)&&("addtag")),evt);
            metaBook.select_target=false;}}
    
    function raiseHUD(evt){
        evt=evt||window.event;
        if (Trace.gestures) fdjtLog("raiseHUD %o",evt);
        setHUD(true);
        cancel(evt);
        return false;}
    metaBook.raiseHUD=raiseHUD;
    function lowerHUD(evt){
        evt=evt||window.event;
        if (Trace.gestures) fdjtLog("lowerHUD %o",evt);
        setHUD(false);
        cancel(evt);
        return false;}
    metaBook.lowerHUD=lowerHUD;

    function saveGloss(evt){
        evt=evt||window.event;
        if (Trace.gestures) fdjtLog("saveGloss %o",evt);
        metaBook.submitGloss();}
    function refreshLayout(evt){
        evt=evt||window.event; cancel(evt);
        if (Trace.gestures) fdjtLog("refreshLayout %o",evt);
        metaBook.refreshLayout();}
    function resetState(evt){
        evt=evt||window.event; cancel(evt);
        fdjtUI.choose(
            {choices: [{label: "OK",isdefault: true,
                        handler: function(){
                            metaBook.resetState();}},
                       {label: "Cancel"}],
             spec: "div.fdjtdialog.mbsettings"},
            "Mark current location as ",
            fdjtDOM("em","latest")," and ",
            fdjtDOM("em","farthest"),"?",
            ((mB.locsync)&&("for all syncing devices")));}
    function refreshOffline(evt){
        evt=evt||window.event; cancel(evt);
        fdjtUI.choose(
            {choices: [{label: "OK",isdefault: true,
                        handler: function(){
                            metaBook.refreshOffline();}},
                       {label: "Cancel"}],
             spec: "div.fdjtdialog.mbsettings"},
            "Reload all glosses and layers?");}
    function clearOffline(evt){
        evt=evt||window.event; cancel(evt);
        if (Trace.gestures) fdjtLog("clearOffline %o",evt);
        metaBook.clearOffline();
        fdjt.ID("METABOOKSETTINGSMESSAGE").innerHTML=
            "<strong>Poof!</strong> Local copies of your "+
            "personalizations (glosses, settings, etc) for this "+
            "book have been erased.";}
    function consolefn(evt){
        evt=evt||window.event; metaBook.consolefn(evt);}

    var devmode_click=false;
    function toggleDevMode(evt){
        fdjtLog("toggleDevMode %o",evt);
        if (devmode_click) {
            var root=document.documentElement||document.body;
            var now=fdjtTime();
            if ((now-devmode_click)<1000) {
                if (mB.devmode)  {
                    metaBook.devmode=false;
                    fdjtState.dropLocal("mB.devmode");
                    dropClass(root,"_DEVMODE");}
                else {
                    metaBook.devmode=true;
                    fdjtState.setLocal("mB.devmode",true);
                    addClass(root,"_DEVMODE");}
                devmode_click=false;}
            else devmode_click=now;}
        else devmode_click=fdjtTime();
        cancel(evt);}

    function cancelNotAnchor(evt){
        var target=fdjt.UI.T(evt);
        if (hasParent(target,"A[href]")) {
            if ((clicked)&&((fdjtTime()-clicked)<2000)) 
                cancel(evt);
            return;}
        else cancel(evt);}

    fdjt.DOM.defListeners(
        metaBook.UI.handlers.mouse,
        {window: {
            keyup: mb_onkeyup,
            keydown: mb_onkeydown,
            keypress: mb_onkeypress,
            focus: mb_onfocus,
            mouseout: metabookmouseout,
            blur: mb_onblur},
         "#METABOOKBODY": {
             mouseup: global_mouseup},
         content: {tap: body_tapped,
                   taptap: body_taptap,
                   hold: body_held,
                   release: body_released,
                   mousedown: body_touchstart,
                   mouseup: body_touchend,
                   click: cancelNotAnchor},
         toc: {tap: toc_tapped,hold: toc_held,
               release: toc_released, slip: toc_slipped,
               mouseover: fdjtUI.CoHi.onmouseover,
               mouseout: fdjtUI.CoHi.onmouseout,
               click: cancel},
         ".mbtocslice": {
             mouseover: fdjtUI.CoHi.onmouseover,
             mouseout: fdjtUI.CoHi.onmouseout},
         glossmark: {mouseup: glossmark_tapped,
                     click: cancel, mousedown: cancel,
                     mouseover: glossmark_hoverstart,
                     mouseout: glossmark_hoverdone},
         hud: {click: default_tap, tap: default_tap},
         "#METABOOKSTARTPAGE": {click: metaBook.UI.dropHUD},
         "#METABOOKMENU": {tap: raiseHUD},
         "#METABOOKSHOWCOVER": {
             tap: showcover_tapped, release: showcover_released},
         "#METABOOKHUDHELP": {click: metaBook.UI.dropHUD},
         ".hudtip": {click: metaBook.UI.dropHUD},
         ".metabookheart": {tap: flyleaf_tap},
         "#METABOOKPAGEREFTEXT": {tap: enterPageRef},
         "#METABOOKPAGENOTEXT": {tap: enterPageNum},
         "#METABOOKLOCPCT": {tap: enterPercentage},
         "#METABOOKLOCOFF": {tap: enterLocation},
         // Return to skimmer
         "#METABOOKSKIMMER": {tap: skimmer_tapped,
                              swipe: skimmer_swiped},
         // Expanding/contracting the skimmer
         // Raise and lower HUD
         "#METABOOKPAGEHEAD": {click: head_tap},
         "#METABOOKTABS": {click: head_tap},
         "#METABOOKHEAD": {click: head_tap},
         "#METABOOKFOOT": {tap: foot_tap},
         ".searchcloud": {
             tap: metaBook.UI.handlers.searchcloud_select,
             release: metaBook.UI.handlers.searchcloud_select},
         "#METABOOKHELPBUTTON": {
             tap: toggleHelp,
             hold: function(evt){setHelp(true); cancel(evt);},
             release: function(evt){setHelp(false); cancel(evt);},
             slip: function(evt){setHelp(false); cancel(evt);}},
         "#METABOOKHELP": {
             click: toggleHelp, mousedown: cancel,mouseup: cancel},
         "#MBPAGERIGHT": {click: function(evt){
             if (hasClass(document.body,"mbSKIMMING"))
                 skimForward(evt);
             else pageForward(evt); 
             cancel(evt);}},
         "#MBPAGELEFT": {click: function(evt){
             if (hasClass(document.body,"mbSKIMMING"))
                 skimBackward(evt);
             else pageBackward(evt); 
             cancel(evt);}},
         "#METABOOKSHOWTEXT": {click: back_to_reading},
         "#METABOOKGLOSSDETAIL": {click: metaBook.UI.dropHUD},
         "#METABOOKNOTETEXT": {click: jumpToNote},
         ".hudmodebutton": {
             tap: hudmodebutton,hold: hudmodebutton,
             slip: hudmodebutton,release: hudmodebutton},
         ".hudbutton[alt='save gloss']": {
             tap: saveGloss,hold: saveGloss},
         ".metabookclosehud": {click: back_to_reading},
         "#METABOOKSETTINGS": {click: fdjt.UI.CheckSpan.onclick},
         ".metabooktogglehelp": {click: toggleHelp},
         "#METABOOKCONSOLETEXTINPUT": {
             focus: function(){
                 fdjt.DOM.addClass('METABOOKCONSOLEINPUT','uptop');},
             blur: function(){
                 fdjt.DOM.dropClass('METABOOKCONSOLEINPUT','uptop');}},
         "#METABOOKCONSOLEBUTTON": {click: consolefn},
         "#METABOOKREFRESHOFFLINE": {click: refreshOffline},
         "#METABOOKREFRESHLAYOUT": {click: refreshLayout},
         "#METABOOKRESETSYNC": {click: resetState},
         ".clearoffline": {click: clearOffline},
         ".metabookclearmode": {click: clearMode},
         "#METABOOKGOTOREFHELP": {click: clearMode},
         "#METABOOKGOTOPAGEHELP": {click: clearMode},
         "#METABOOKGOTOLOCHELP": {click: clearMode},
         ".metabookshowsearch": {click: function(evt){
             metaBook.showSearchResults(); cancel(evt);}},
         ".metabookrefinesearch": {click: function(evt){
             setMode('refinesearch'); cancel(evt);}},
         ".metabookexpandsearch": {click: function(evt){
             setMode('expandsearch'); cancel(evt);}},
         ".metabookclearsearch": {click: function(evt){
             evt=evt||window.event;
             metaBook.UI.handlers.clearSearch(evt);
             cancel(evt);
             return false;}},
         "#METABOOKSEARCHINFO": { click: metaBook.searchTags_onclick },
         "#METABOOKINFOPANEL": {
             click: toggleDevMode},
         ".metabooksettings input[type='RADIO']": {
             change: mB.configChange},
         ".metabooksettings input[type='CHECKBOX']": {
             change: mB.configChange}
        });

    fdjt.DOM.defListeners(
        metaBook.UI.handlers.touch,
        {window: {
            keyup: mb_onkeyup,
            keydown: mb_onkeydown,
            keypress: mb_onkeypress,
            touchmove: preview_touchmove_nodefault,
            focus: mb_onfocus,
            touchstart : dombody_touched,
            blur: mb_onblur},
         content: {tap: body_tapped,
                   hold: body_held,
                   taptap: body_taptap,
                   release: body_released,
                   swipe: body_swiped,
                   touchstart: body_touchstart,
                   touchend: body_touchend,
                   touchmove: noDefault,
                   click: cancelNotAnchor},
         hud: {tap: default_tap},
         toc: {tap: toc_tapped,hold: toc_held,
               slip: toc_slipped, release: toc_released,
               touchtoo: toc_touchtoo,
               touchmove: preview_touchmove_nodefault},
         glossmark: {touchstart: glossmark_tapped,touchend: cancel},
         "#METABOOKSTARTPAGE": {touchend: metaBook.UI.dropHUD},
         "#METABOOKMENU": {tap: raiseHUD},
         "#METABOOKSHOWCOVER": {
             tap: showcover_tapped, release: showcover_released},
         "#METABOOKSEARCHINFO": { click: metaBook.searchTags_onclick },
         "#METABOOKPAGEREFTEXT": {tap: enterPageRef},
         "#METABOOKPAGENOTEXT": {tap: enterPageNum},
         "#METABOOKLOCPCT": {tap: enterPercentage},
         "#METABOOKLOCOFF": {tap: enterLocation},
         // Return to skimming
         "#METABOOKSKIMMER": {
             tap: skimmer_tapped,
             swipe: skimmer_swiped},
         // Expanding/contracting the skimmer
         // Raise and lower HUD
         "#METABOOKPAGEHEAD": {touchstart: head_tap},
         "#METABOOKTABS": {touchstart: head_tap},
         "#METABOOKHEAD": {touchend: head_tap},
         "#METABOOKFOOT": {
             tap: foot_tap,touchstart: noDefault,touchmove: noDefault},
         "#METABOOKGLOSSDETAIL": {
             touchend: metaBook.UI.dropHUD,click: cancel},
         ".searchcloud": {
             tap: metaBook.UI.handlers.searchcloud_select,
             release: metaBook.UI.handlers.searchcloud_select},
         "#MBPAGERIGHT": {touchstart: function(evt){
             if (hasClass(document.body,"mbSKIMMING"))
                 skimForward(evt);
             else pageForward(evt); 
             cancel(evt);}},
         "#MBPAGELEFT": {touchstart: function(evt){
             if (hasClass(document.body,"mbSKIMMING"))
                 skimBackward(evt);
             else pageBackward(evt); 
             cancel(evt);}},
         "#METABOOKHELP": {tap: toggleHelp, swipe: cancel},
         "#METABOOKHELPBUTTON": {
             tap: toggleHelp,
             hold: function(evt){setHelp(true); cancel(evt);},
             release: function(evt){setHelp(false); cancel(evt);},
             slip: function(evt){setHelp(false); cancel(evt);}},
         "#METABOOKNOTETEXT": {touchend: jumpToNote,click: cancel},
         "#METABOOKSHOWTEXT": {
             touchstart: back_to_reading,
             touchmove: cancel,
             touchend: cancel},
         ".hudmodebutton": {
             tap: hudmodebutton,hold: hudmodebutton,release: hudmodebutton,
             slip: hudmodebutton},
         ".hudbutton[alt='save gloss']": {
             tap: saveGloss,hold: saveGloss},
         // GLOSSFORM rules
         ".metabookclosehud": {
             click: back_to_reading,
             touchmove: cancel,
             touchend: cancel},
         "#METABOOKSETTINGS": {
             touchend: fdjt.UI.CheckSpan.onclick},
         ".metabooktogglehelp": {
             touchstart: cancel,
             touchend: toggleHelp},
         
         "#METABOOKCONSOLETEXTINPUT": {
             touchstart: function(){
                 $ID('METABOOKCONSOLETEXTINPUT').focus();},
             focus: function(){
                 fdjt.DOM.addClass('METABOOKCONSOLEINPUT','ontop');},
             blur: function(){
                 fdjt.DOM.dropClass('METABOOKCONSOLEINPUT','ontop');}},

         "#METABOOKCONSOLEBUTTON": {
             touchstart: cancel, touchend: consolefn},
         "#METABOOKREFRESHOFFLINE": {
             touchstart: refreshOffline, touchend: cancel},
         "#METABOOKREFRESHLAYOUT": {
             touchstart: refreshLayout, touchend: cancel},
         "#METABOOKRESETSYNC": {touchend: cancel, touchstart: resetState},
         ".clearoffline": {touchstart: cancel, touchend: clearOffline},
         ".metabookclearmode": {touchstart: cancel, touchend: clearMode},
         "#METABOOKGOTOREFHELP": {touchstart: cancel, touchend: clearMode},
         "#METABOOKGOTOPAGEHELP": {touchstart: cancel, touchend: clearMode},
         "#METABOOKGOTOLOCHELP": {touchstart: cancel, touchend: clearMode},
         ".metabookshowsearch": {
             touchstart: cancel,
             touchend: function(evt){
                 metaBook.showSearchResults(); cancel(evt);}},
         ".metabookrefinesearch": {
             touchstart: cancel,
             touchend: function(evt){
                 setMode('refinesearch'); cancel(evt);}},
         ".metabookexpandsearch": {
             touchstart: cancel,
             touchend: function(evt){
                 setMode('expandsearch'); cancel(evt);}},
         ".metabookclearsearch": {
             touchstart: cancel,
             touchend: function(evt){
                 evt=evt||window.event;
                 metaBook.UI.handlers.clearSearch(evt);
                 cancel(evt);
                 return false;}},
         summary: {touchmove: preview_touchmove_nodefault},
         "#METABOOKINFOPANEL": {
             touchstart: toggleDevMode},
         ".metabooksettings input[type='RADIO']": {
             change: mB.configChange},
         ".metabooksettings input[type='CHECKBOX']": {
             change: mB.configChange}});

    var vis_listeners={window: {}};
    vis_listeners.window[fdjtDOM.vischange]=metabookvischange;

    fdjt.DOM.defListeners(metaBook.UI.handlers.touch,vis_listeners);
    fdjt.DOM.defListeners(metaBook.UI.handlers.mouse,vis_listeners);
    
})();

/* Emacs local variables
   ;;;  Local variables: ***
   ;;;  compile-command: "cd ..; make" ***
   ;;;  indent-tabs-mode: nil ***
   ;;;  End: ***
*/

