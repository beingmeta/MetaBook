/* -*- Mode: Javascript; Character-encoding: utf-8; -*- */

/* ###################### metabook/interaction.js ###################### */

/* Copyright (C) 2009-2014 beingmeta, inc.

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

/* Initialize these here, even though they should always be
   initialized before hand.  This will cause various code checkers to
   not generate unbound variable warnings when called on individual
   files. */
// var fdjt=((typeof fdjt !== "undefined")?(fdjt):({}));
// var metaBook=((typeof metaBook !== "undefined")?(metaBook):({}));
// var Knodule=((typeof Knodule !== "undefined")?(Knodule):({}));
// var iScroll=((typeof iScroll !== "undefined")?(iScroll):({}));

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
    var fdjtTime=fdjt.Time;
    var fdjtLog=fdjt.Log;
    var fdjtDOM=fdjt.DOM;
    var fdjtUI=fdjt.UI;
    var RefDB=fdjt.RefDB;
    var fdjtID=fdjt.ID;
    var mbID=metaBook.ID;

    // Imports (kind of )
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
    var getInputsFor=fdjtDOM.getInputsFor;
    var getInputValues=fdjtDOM.getInputValues;
    var Selector=fdjtDOM.Selector;

    var submitEvent=fdjtUI.submitEvent;

    var reticle=fdjtUI.Reticle;

    /* For tracking gestures */
    var preview_timer=false;

    metaBook.uiclasses=/\b(metabookui|glossmark)\b/gi;

    metaBook.addConfig("controlc",function(key,val){metaBook.controlc=val;});

    /* Setup for gesture handling */

    function addHandlers(node,type){
        var mode=metaBook.ui;
        fdjtDOM.addListeners(node,metaBook.UI.handlers[mode][type]);}
    metaBook.UI.addHandlers=addHandlers;

    function externClickable(evt){
        var target=fdjtUI.T(evt);
        var anchor=getParent(target,"A");
        if ((anchor)&&(anchor.href)) {
            if (anchor.href[0]==="#") return false;
            else if (anchor.getAttribute("href")[0]==="#")
                return false;
            else return true;}
        else return isClickable(evt);}

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
            addHandlers(fdjtID("METABOOKBODY"),'content');
            metaBook.TapHold.body=fdjtUI.TapHold(
                fdjt.ID("METABOOKBODY"),
                {override: true,noslip: true,id: "METABOOKBODY",
                 maxtouches: 2,taptapthresh: 350,
                 untouchable: externClickable,
                 movethresh: 10});
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

    /* New simpler UI */

    var gloss_focus=false;
    var gloss_blurred=false;
    var gloss_blur_timeout=false;

    function glossform_focus(evt){
        evt=evt||window.event;
        gloss_blurred=false;
        var target=fdjtUI.T(evt);
        var form=getParent(target,"FORM");
        var div=((form)&&(getParent(form,".metabookglossform")));
        var input=((div)&&(getChild(div,"TEXTAREA")));
        if (div) {
            metaBook.setGlossMode(false);}
        if (input) metaBook.setFocus(input);
        metaBook.setHUD(true);
        metaBook.freezelayout=true;
        gloss_focus=form;}
    function glossform_blur(evt){
        evt=evt||window.event;
        var target=fdjtUI.T(evt);
        var form=getParent(target,"FORM");
        var div=((form)&&(getParent(form,".metabookglossform")));
        var input=((div)&&(getChild(div,"TEXTAREA")));
        if (div) dropClass(div,"focused");
        if (input) metaBook.clearFocus(input);
        metaBook.setHUD(false,false);
        gloss_blurred=fdjtTime();
        metaBook.freezelayout=false;
        // Restore this without removal of the gloss
        // if ((div)&&(hasClass(div,"modified"))) metaBook.submitGloss(div);
        gloss_focus=false;}
    function glossform_touch(evt){
        evt=evt||window.event;
        if (gloss_blur_timeout) clearTimeout(gloss_blur_timeout);
        var target=fdjtUI.T(evt);
        var closing=getParent(target,".submitclose");
        if (closing) dropClass(closing,"submitclose");
        var form=getParent(target,"FORM");
        var div=((form)&&(getParent(form,".metabookglossform")));
        var input=((div)&&(getChild(div,"TEXTAREA")));
        if (hasClass(div,"focused")) {
            setTimeout(function(){
                if (input) {metaBook.setFocus(input); input.focus();}},
                       150);
            return;}
        if ((hasParent(target,".addglossmenu"))||
            (hasParent(target,".glossexposure")))
            return;
        if (!(hasParent(target,".textbox"))) fdjtUI.cancel(evt);
        addClass(div,"focused");
        metaBook.setHUD(true);
        glossform_focus(evt);}
    metaBook.UI.glossform_touch=glossform_touch;
    metaBook.UI.glossform_focus=glossform_focus;
    metaBook.UI.glossform_blur=glossform_blur;

    /* Adding a gloss button */
    
    function glossbutton_ontap(evt){
        evt=evt||window.event;
        var target=fdjtUI.T(evt);
        var passage=getTarget(target);
        if ((metaBook.mode==="addgloss")&&
            (metaBook.glosstarget===passage)) {
            fdjtUI.cancel(evt);
            metaBook.setMode(true);}
        else if (passage) {
            fdjtUI.cancel(evt);
            var form=metaBook.setGlossTarget(passage);
            if (!(form)) return;
            metaBook.setMode("addgloss");
            metaBook.setGlossForm(form);}}

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

    var saving_dialog=false;
    var gesture_start=false;
    var clicked=false;

    function body_tapped(evt){
        evt=evt||window.event;
        var target=fdjtUI.T(evt);
        var sX=evt.screenX, sY=evt.screenY;
        var cX=evt.clientX, cY=evt.clientY;
        var now=fdjtTime(), touch=false;

        if (Trace.gestures)
            fdjtLog("body_tapped %o c=%d,%d now=%o p=%o",
                    evt,cX,cY,now,metaBook.previewing);
        
        // If we're previewing, stop it and go to the page we're
        //  previewing (which was touched)
        if (metaBook.previewing) {
            var jumpto=getTarget(target);
            metaBook.stopPreview("body_tapped/stop_preview",jumpto||true);
            fdjtUI.TapHold.clear();
            fdjt.UI.cancel(evt);
            return false;}

        if (hasParent(target,".glossmark")) {
            cancel(evt);
            return false;}

        if ((metaBook.touch)&&(metaBook.textinput)) {
            metaBook.clearFocus(metaBook.textinput);
            cancel(evt);
            return;}

        if (hasClass(document.body,"mbSHOWHELP")) {
            dropClass(document.body,"mbSHOWHELP");
            cancel(evt);
            return;}

        if (metaBook.glosstarget) {
            var glossform=metaBook.glossform;
            if (hasParent(target,metaBook.glosstarget)) {
                metaBook.setMode("addgloss",false);}
            else if (saving_dialog) {}
            else if (glossform) {
                if (!(hasClass(glossform,"modified")))
                    metaBook.cancelGloss();
                else if (hasClass(glossform,"glossadd")) 
                    saveGlossDialog();
                else metaBook.submitGloss(glossform);
                fdjtUI.cancel(evt);
                return;}}

        if ((metaBook.hudup)||(metaBook.mode)) {
            metaBook.setMode(false); metaBook.setHUD(false);
            if (fdjtID("METABOOKOPENGLOSSMARK")) {
                if (metaBook.target)
                    metaBook.clearHighlights(metaBook.target);
                fdjtID("METABOOKOPENGLOSSMARK").id="";}
            fdjtUI.cancel(evt); gesture_start=false;
            clicked=fdjtTime();
            // if (getTarget(target)) metaBook.setTarget(false);
            return false;}

        // If we're in a glossmark, let its handler apply
        if (hasParent(target,".glossmark")) {
            fdjtUI.cancel(evt);
            return false;}

        // Various kinds of content click handling (anchors, details,
        // asides, etc)
        if (handle_body_click(target)) {
            fdjtUI.cancel(evt);
            return false;}

        if (fdjtID("METABOOKOPENGLOSSMARK")) {
            fdjtID("METABOOKOPENGLOSSMARK").id="";
            if (metaBook.target) metaBook.clearHighlights(metaBook.target);
            fdjtUI.cancel(evt); gesture_start=false;
            return;}

        // If we get here, we're doing a page flip
        if ((evt.changedTouches)&&(evt.changedTouches.length)) {
            touch=evt.changedTouches[0];
            sX=touch.screenX; sY=touch.screenY;
            cX=touch.clientX; cY=touch.clientY;}
        if (Trace.gestures)
            fdjtLog("body_tapped/fallthrough (%o) %o, m=%o, @%o,%o, vw=%o",
                    evt,target,metaBook.mode,cX,cY,fdjtDOM.viewWidth());
        if ((metaBook.fullheight)&&(!(metaBook.hudup))&&
            ((cY<50)||(cY>(fdjtDOM.viewHeight()-50)))) 
            metaBook.setHUD(true);
        else if (cX<(fdjtDOM.viewWidth()/3))
            metaBook.Backward(evt);
        else metaBook.Forward(evt);
        fdjtUI.cancel(evt); gesture_start=false;
        return;}

    function saveGlossDialog(){
        // This prompts for updating the layout
        var msg=fdjtDOM("div.message","Save gloss?");
        saving_dialog=true;
        // When a choice is made, it becomes the default
        // When a choice is made to not resize, the
        // choice timeout is reduced.
        var choices=[
            {label: "Save",
             handler: function(){
                 metaBook.submitGloss();
                 saving_dialog=false;},
             isdefault: true},
            {label: "Discard",
             handler: function(){
                 metaBook.cancelGloss();
                 saving_dialog=false;}}];
        var spec={choices: choices,
                  timeout: (metaBook.save_gloss_timeout||
                            metaBook.choice_timeout||7),
                  spec: "div.fdjtdialog.fdjtconfirm.savegloss"};
        saving_dialog=fdjtUI.choose(spec,msg);
        return saving_dialog;}
    metaBook.saveGlossDialog=saveGlossDialog;

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

    function handle_body_click(target){
        // Assume 1s gaps are spurious
        if ((clicked)&&((fdjtTime()-clicked)<1000)) return true;

        // Handle various click-like operations, overriding to sBook
        //  navigation where appropriate.  Set *clicked* to the
        //  current time when you do so, letting the body_click handler
        //  appropriately ignore its invocation.
        var anchor=getParent(target,"A"), href, elt=false;
        // If you tap on a relative anchor, move there using metaBook
        // rather than the browser default
        if ((anchor)&&(anchor.href)&&(href=anchor.getAttribute("href"))) {
            if (Trace.gestures)
                fdjtLog("ctouch: follow link %s",href);
            var rel=anchor.rel, classname=anchor.className;
            if ((href[0]==="#")&&
                (((rel)&&
                  (rel.search(/\b((sbooknote)|(footnote)|(endnote)|(note))\b/)>=0))||
                 ((classname)&&
                  (classname.search(/\b((sbooknote)|(sbooknoteref))\b/)>=0))||
                 ((metaBook.sbooknoterefs)&&(metaBook.sbooknoterefs.match(anchor))))) {
                var note_node=getNoteNode(href.slice(1));
                var noteid=note_node.id;
                metaBook.DOM.noteshud.innerHTML="";
                var shownote=note_node.cloneNode(true);
                fdjtDOM.stripIDs(shownote);
                dropClass(shownote,/\bmetabook\S+/g);
                addClass(shownote,"metabooknotebody");                
                metaBook.DOM.noteshud.setAttribute("data-note",noteid||(href.slice(1)));
                fdjtDOM.append(metaBook.DOM.noteshud,shownote);
                metaBook.setMode("shownote");
                gesture_start=false;
                clicked=fdjtTime();
                return true;}
            else if ((href[0]==="#")&&(rel)&&
                     (rel.search(/\b((sidebar)|(breakout)|(tangent))\b/)>=0)) {
                var aside_target=fdjt.ID(href.slice(1));
                fdjtDOM.removeChildren(metaBook.DOM.asidehud);
                fdjtDOM.append(metaBook.DOM.asidehud,aside_target.cloneNode(true));
                metaBook.setMode("showaside");
                gesture_start=false;
                clicked=fdjtTime();
                return true;}
            else if ((href[0]==='#')&&(fn=metaBook.xtargets[href.slice(1)])) {
                var fn=metaBook.xtargets[href.slice(1)];
                gesture_start=false;
                clicked=fdjtTime();
                fn();
                return true;}
            else if ((href[0]==='#')&&(elt=resolve_anchor(href.slice(1)))) {
                // It's an internal jump, so we follow that
                metaBook.JumpTo(elt);
                gesture_start=false;
                clicked=fdjtTime();
                return true;}
            else {
                // We force links to leave the page, hoping people
                //  won't find it obnoxious.  We could also open up
                //  a little iframe in some circumstances
                if (!(anchor.target)) anchor.target="_blank";
                gesture_start=false;
                clicked=fdjtTime();
                return false;}}

        var details=getParent(target,"details,.html5details,.sbookdetails");
        if (details) {
            fdjtDOM.removeChildren(metaBook.DOM.notehud);
            metaBook.DOM.notehud.innerHTML=details.innerHTML;
            metaBook.setMode("showdetails");
            clicked=fdjtTime();
            return true;}
        
        var aside=getParent(target,"aside,.html5aside,.sbookaside");
        if (aside) {
            fdjtDOM.removeChildren(metaBook.DOM.asidehud);
            metaBook.DOM.asidehud.innerHTML=aside.innerHTML;
            metaBook.setMode("showaside");
            clicked=fdjtTime();
            return true;}

        var glossref=getParent(target,"[data-glossid]");
        if (glossref) {
            var glossid=glossref.getAttribute("data-glossid");
            var gloss=metaBook.glossdb.ref(glossid);
            if (!(gloss)) return false;
            var slicediv=fdjtDOM("div.metabookglosses.metabookslice");
            var slice=new MetaBookSlice(slicediv,[gloss]);
            var hudwrapper=fdjtDOM("div.hudpanel#METABOOKPOINTGLOSSES",slicediv);
            fdjtDOM.replace("METABOOKPOINTGLOSSES",hudwrapper);
            metaBook.setTarget(target);
            slice.update();
            metaBook.setMode("openglossmark");
            return true;}

        return false;}

    function getNoteNode(ref){
        var elt=mbID(ref);
        var body=fdjt.ID("METABOOKBODY"), db=document.body;
        if (!(elt)) {
            var elts=document.getElementsByName(ref);
            if (!(body)) return false;
            if (elts.length) {
                var i=0, lim=elts.length; while (i<lim) {
                    if (hasParent(elt[i],body)) {elt=elt[i]; break;}
                    else i++;}}}
        if (!(elt)) return;
        var scan=elt, style=fdjtDOM.getStyle(elt), block=false;
        var notespec=metaBook.sbooknotes;
        while (scan) {
            if (scan===body) break;
            else if (scan===db) break;
            else if ((notespec)&&(notespec.match(scan))) return scan;
            else if (block) {}
            else if (style.display==='block') {block=scan; style=false;}
            else {}
            scan=scan.parentNode;
            style=fdjtDOM.getStyle(scan);}
        if (block) return block; else return elt;
        return elt;}

    function jumpToNote(evt){
        evt=evt||window.event;
        var target=fdjt.UI.T(evt);
        var anchor=getParent(target,"A[href]");
        if (!(anchor)) {
            fdjt.UI.cancel(evt);
            var noteshud=metaBook.DOM.noteshud;
            var jumpto=noteshud.getAttribute("data-note");
            if (jumpto) {
                noteshud.removeAttribute("data-note");
                noteshud.innerHTML="";
                metaBook.setMode(false);
                metaBook.GoTo(jumpto,"jumpToNote",true,true);}
            else metaBook.setMode(false);}}
    
    var selectors=[];
    var slip_timer=false;
    function body_held(evt){
        evt=evt||window.event;
        var target=fdjtUI.T(evt);
        var passage=getTarget(target);
        if (Trace.gestures) 
            fdjtLog("body_held %o p=%o p.p=%o bc=%s hc=%s",
                    evt,passage,((passage)&&(passage.parentNode)),
                    document.body.className,
                    metaBook.HUD.className);
        if (metaBook.previewing) return;
        else if (hasParent(target,"A")) {
            var anchor=getParent(target,"A");
            var href=((anchor)&&(anchor.getAttribute("href")));
            fdjtUI.cancel(evt);
            if ((href)&&(href[0]==="#")&&(mbID(href.slice(1)))) {
                if (Trace.gestures) 
                    fdjtLog("anchor_preview/body_held %o %o %o",
                            evt,anchor,href);
                metaBook.startPreview(href.slice(1),"content/anchor_held");
                return;}}
        if (!(passage)) return;
        if (metaBook.glosstarget===passage) {
            if (metaBook.mode!=="addgloss")
                metaBook.setMode("addgloss",false);
            return;}
        // If the HUD is up, bring it down, but don't start a gloss
        if (metaBook.hudup) {
            fdjtUI.cancel(evt);
            metaBook.setHUD(false);
            return;}
        var selecting=metaBook.UI.selectText(passage);
        if ((metaBook.TapHold.page)&&(metaBook.TapHold.page.abort))
            metaBook.TapHold.page.abort();
        if ((metaBook.TapHold.content)&&(metaBook.TapHold.page.content))
            metaBook.TapHold.content.abort();
        metaBook.select_target=passage;
        selectors.push(selecting);
        selectors[passage.id]=selecting;
        fdjtUI.TapHold.clear();
        startAddGloss(passage,false,evt);
        // This makes a selection start on the region we just created.
        if ((Trace.gestures)||(Trace.selecting)) 
            fdjtLog("body_held/select_wait %o %o %o",
                    selecting,passage,evt);
        setTimeout(function(){
            if ((Trace.gestures)||(Trace.selecting)) 
                fdjtLog("body_held/select_start %o %o %o",
                        selecting,passage,evt);
            selecting.startEvent(evt,250);},
                   0);}
    metaBook.getTextSelectors=function getTextSelectors(){return selectors;};

    function body_taptap(evt){
        var target=fdjtUI.T(evt);
        var passage=getTarget(target);
        if (Trace.gestures) 
            fdjtLog("body_taptap %o p=%o p.p=%o bc=%s hc=%s t=%o gt=%o",
                    evt,passage,((passage)&&(passage.parentNode)),
                    document.body.className,metaBook.HUD.className,
                    target,metaBook.glosstarget);
        if (hasParent(target,"IMG,AUDIO,VIDEO,OBJECT")) {
            metaBook.startZoom(getParent(target,"IMG,AUDIO,VIDEO,OBJECT"));
            fdjt.UI.cancel(evt);
            return;}
        if (metaBook.glosstarget) {
            if (hasParent(target,metaBook.glosstarget)) {
                metaBook.setMode("addgloss",false);}
            else if (saving_dialog) {}
            else {
                saveGlossDialog();
                fdjtUI.cancel(evt);
                return;}}
        if (!(passage)) return;
        if (metaBook.glosstarget===passage) {
            if (metaBook.mode!=="addgloss")
                metaBook.setMode("addgloss",false);
            return;}
        var choices=[
            {label: "Add Gloss",
             handler: function(){startGloss(passage);},
             isdefault: true}];
        if (window.ClipboardEvent) {
            choices.push({label: "Copy link",
                          handler: function(){copyURI(passage);}});
            choices.push({label: "Copy content",
                          handler: function(){copyContent(passage);}});}
        addOptions(passage,choices);
        if (choices.length===1) {
            fdjtUI.cancel(evt);
            startGloss(passage);
            return;}
        fdjtUI.cancel(evt);
        choices.push(
            {label: "Cancel",
             handler: function(){
                 metaBook.cancelGloss();
                 saving_dialog=false;}});
        var max=0, i=0, lim=choices.length;
        while (i<lim) {
            var ch=choices[i++];
            var len=ch.label.length;
            if (len>max) max=len;}
        var spec={choices: choices,
                  spec: "div.fdjtdialog",
                  style: "width: "+(max*0.8)+"em"};
        fdjtUI.choose(spec);}

    function addOptions(passage,choices){
        var scan=passage; while (scan) {
            var link=passage.getAttribute("data-xref");
            if (link) {
                var space=link.indexOf(' ');
                var label=((space>0)?(link.slice(space+1)):(link));
                var href=((space>0)?(link.slice(0,space)):(link));
                href=href.replace("{{ID}}",passage.id);
                var opt={label: label, handler: makeOpener(href)};
                choices.push(opt);}
            scan=scan.parentNode;}}
    
    function makeOpener(url){
        return function (){window.open(url);};}
    function copyURI(passage){
        var CE=window.ClipboardEvent;
        var evt = new CE('copy',{ dataType: 'text/plain', 
                                  data: metaBook.refuri+"#"+passage.id } );
        document.dispatchEvent(evt);}
    function copyContent(passage){
        var CE=window.ClipboardEvent;
        var evt = new CE('copy',{ dataType: 'text/html', 
                                  data: passage.innerHTML } );
        document.dispatchEvent(evt);}

    function startGloss(passage){
        var selecting=metaBook.UI.selectText(passage);
        if ((metaBook.TapHold.page)&&(metaBook.TapHold.page.abort))
            metaBook.TapHold.page.abort();
        if ((metaBook.TapHold.content)&&(metaBook.TapHold.page.content))
            metaBook.TapHold.content.abort();
        metaBook.select_target=passage;
        selectors.push(selecting);
        selectors[passage.id]=selecting;
        fdjtUI.TapHold.clear();
        startAddGloss(passage,false,false);}

    var body_tapstart=false;
    function body_touchstart(evt){
        evt=evt||window.event;
        if (metaBook.zoomed) return;
        var target=fdjtUI.T(evt);
        if (target.id!=="METABOOKBODY") return;
        body_tapstart=fdjtTime();}

    function body_touchend(evt){
        evt=evt||window.event;
        if (metaBook.zoomed) return;
        var target=fdjtUI.T(evt);
        if (target.id!=="METABOOKBODY") return;
        if ((body_tapstart)&&(true) //((fdjtTime()-body_tapstart)<1000)
           ) {
            if (metaBook.TapHold.body) metaBook.TapHold.body.abort();
            fdjtUI.cancel(evt);
            var x=(evt.clientX)||
                ((evt.changedTouches)&&
                 (evt.changedTouches.length)&&
                 (evt.changedTouches[0].clientX));
            var w=fdjtDOM.viewWidth();
            if (x>(w/2)) pageForward(evt);
            else pageBackward(evt);}}
    
    function abortSelect(except){
        var i=0, lim=selectors.length;
        while (i<lim) {
            var sel=selectors[i++];
            if (sel!==except) sel.clear();}
        selectors=[];
        metaBook.select_target=false;}

    function body_released(evt){
        evt=evt||window.event;
        if (metaBook.zoomed) return;
        var target=fdjtUI.T(evt), children=false;
        if (Trace.gestures) fdjtLog("body_released %o",evt);
        if (metaBook.previewing) {
            metaBook.stopPreview("body_released");
            fdjtUI.cancel(evt);
            return;}
        else if (hasParent(target,"A")) {
            fdjtUI.cancel(evt);
            return;}
        var passage=((hasParent(target,".fdjtselecting"))&&
                     (getTarget(target)));
        if (!(passage)) {
            children=getChildren(target,".fdjtselected");
            if (children.length===0) {abortSelect(); return;}
            target=children[0]; passage=getTarget(target);}
        if (Trace.gestures)
            fdjtLog("body_released %o p=%o gt=%o gf=%o",
                    evt,passage,metaBook.glosstarget,metaBook.glossform);
        if (metaBook.glosstarget===passage) {
            if (metaBook.glossform)
                metaBook.glossform.id="METABOOKLIVEGLOSS";
            if (metaBook.mode!=="addgloss") metaBook.setMode("addgloss");}
        else startAddGloss(passage,((evt.shiftKey)&&("addtag")),evt);}

    function startAddGloss(passage,mode,evt){
        if (metaBook.glosstarget===passage) {
            if ((Trace.gestures)||(Trace.glossing))
                fdjtLog("startAddGloss/resume %o %o form=%o",
                        evt,passage,metaBook.glossform);
            if (mode) metaBook.setGlossMode(mode,metaBook.glossform);
            metaBook.setMode("addgloss",true);
            if (evt) fdjtUI.cancel(evt);
            return;}
        var selecting=selectors[passage.id]; abortSelect(selecting);
        var form_div=metaBook.setGlossTarget(
            passage,((metaBook.mode==="addgloss")&&(metaBook.glossform)),selecting);
        var form=getChild(form_div,"form");
        if (!(form)) return;
        else if (evt) fdjtUI.cancel(evt);
        if ((Trace.gestures)||(Trace.glossing))
            fdjtLog("startAddGloss (%o) %o f=%o/%o",
                    evt,passage,form_div,form);
        metaBook.setGlossForm(form_div);
        if (mode) form.className=mode;
        metaBook.setMode("addgloss",false);}
    metaBook.startAddGloss=startAddGloss;

    function body_swiped(evt){
        if (metaBook.zoomed) return;
        var dx=evt.deltaX, dy=evt.deltaY;
        var vw=fdjtDOM.viewWidth();
        var adx=((dx<0)?(-dx):(dx)), ady=((dy<0)?(-dy):(dy));
        var head=metaBook.head;
        var headinfo=((head)&&(head.id)&&(metaBook.docinfo[head.id]));
        if (Trace.gestures)
            fdjtLog("swiped d=%o,%o, ad=%o,%o, s=%o,%o vw=%o, n=%o",
                    dx,dy,adx,ady,evt.startX,evt.startY,vw,evt.ntouches);
        if (adx>(ady*2)) {
            // Horizontal swipe
            if (dx<-(metaBook.minswipe||10)) {
                if ((evt.ntouches>1)&&
                    (hasClass(document.body,"mbSKIMMING")))
                    metaBook.skimForward(evt);
                else if (evt.ntouches>1) {
                    if (!(headinfo)) metaBook.Forward(evt);
                    else if ((headinfo.sub)&&(headinfo.sub.length)) 
                        metaBook.GoTo(headinfo.sub[0].frag,"doubleswipe");
                    else if (headinfo.next)
                        metaBook.GoTo(headinfo.next.frag,"doubleswipe");
                    else if (headinfo.head)
                        metaBook.GoTo(headinfo.head.frag,"doubleswipe");
                    else metaBook.Forward(evt);}
                else metaBook.Forward(evt);}
            else if (dx>(metaBook.minswipe||10)) {
                if ((evt.ntouches>1)&&
                    (hasClass(document.body,"mbSKIMMING")))
                    metaBook.skimBackward(evt);
                else if (evt.ntouches>1) window.history.back();
                else metaBook.Backward(evt);}}
        else if (ady>(adx*2)) {
            // Vertical swipe
            if (!(metaBook.hudup)) {
                if (ady<=(metaBook.minswipe||10)) return; // Ignore really short swipes 
                else if ((evt.startX<(vw/5))&&(dy<0))
                    // On the left, up, show help
                    metaBook.setMode("help");
                else if ((evt.startX<(vw/5))&&(dy>0))
                    // On the left, down, show TOC
                    metaBook.setMode("statictoc");
                else if ((evt.startX>(vw*0.8))&&(dy>0))
                    // On the right, down, show SEARCH
                    metaBook.setMode("search");
                else if ((evt.startX>(vw*0.8))&&(dy<0))
                    // On the right, up, show GLOSSES
                    metaBook.setMode("allglosses");
                else if (dy>0) {
                    metaBook.clearStateDialog();
                    metaBook.showCover();}
                else metaBook.setHUD(true);}
            else if (dy<-(metaBook.minswipe||10)) metaBook.setMode("allglosses");
            else if (dy>(metaBook.minswipe||10)) metaBook.setMode("search");}
        else {}}

    function initGlossMode(){
        var form=getChild("METABOOKLIVEGLOSS","form");
        if (form) {
            var input=getInput(form,"NOTE");
            if (input) metaBook.setFocus(input);
            metaBook.setGlossMode(form.className);}}
    metaBook.initGlossMode=initGlossMode;

    function body_click(evt){
        evt=evt||window.event;
        if (metaBook.zoomed) return;
        var target=fdjtUI.T(evt);
        // This avoids double-handling of clicks
        if ((clicked)&&((fdjtTime()-clicked)<3000))
            fdjtUI.cancel(evt);
        else if (handle_body_click(target)) {
            fdjtUI.cancel(evt);
            return;}
        else if (isClickable(target)) return;
        else fdjtUI.cancel(evt);}

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
        if (metaBook.previewing) {
            // Because we're previewing, this slice is invisible, so
            //  the user really meant to tap on the body underneath,
            //  so we stop previewing and jump there We might try to
            //  figure out exactly which element was tapped somehow
            metaBook.stopPreview("toc_tapped");
            fdjtUI.cancel(evt);
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
            fdjtUI.cancel(evt);}
        else if (Trace.gestures) fdjtLog("toc_tapped %o noabout", evt);
        else {}}
    function toc_held(evt){
        evt=evt||window.event;
        var target=fdjtUI.T(evt), about=getAbout(target);
        if (preview_timer) {
            clearTimeout(preview_timer); preview_timer=false;}
        if (slip_timer) {
            clearTimeout(slip_timer); slip_timer=false;}
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
            metaBook.startPreview(mbID(ref),"toc_held");
            return fdjtUI.cancel(evt);}
        else if (Trace.gestures) fdjtLog("toc_held %o noabout", evt);
        else {}}
    function toc_released(evt){
        evt=evt||window.event;
        var about=getAbout(fdjtUI.T(evt));
        if (preview_timer) {
            clearTimeout(preview_timer); preview_timer=false;}
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
            if (metaBook.previewing)
                metaBook.stopPreview("toc_released");}
        else if (Trace.gestures) {
            fdjtLog("toc_released %o noabout",evt);
            metaBook.stopPreview("toc_released");}
        else {
            metaBook.stopPreview("toc_released");}
        fdjtUI.cancel(evt);}
    function toc_touchtoo(evt){
        evt=evt||window.event;
        if (preview_timer) {
            clearTimeout(preview_timer); preview_timer=false;}
        if (!(metaBook.previewing)) return;
        else if (Trace.gestures) {
            fdjtLog("toc_touchtoo %o noabout",evt);
            metaBook.stopPreview("toc_touchtoo",true);}
        else {
            metaBook.stopPreview("toc_touchtoo",true);}
        fdjtUI.cancel(evt);}
    function toc_slipped(evt){
        evt=evt||window.event;
        if (slip_timer) return;
        slip_timer=setTimeout(function(){
            slip_timer=false;
            if (Trace.gestures)
                fdjtLog("toc_slipped/timeout %o",evt);
            metaBook.stopPreview("toc_slipped");},
                              500);}

    /* Slice handlers */

    function getCard(target){
        return ((hasClass(target,"metabookcard"))?(target):
                (getParent(target,".metabookcard")))||
            getChild(target,".metabookcard");}

    function slice_tapped(evt){
        var target=fdjtUI.T(evt);
        if (Trace.gestures)
            fdjtLog("slice_tapped %o: %o",evt,target);
        if (metaBook.previewing) {
            // Because we're previewing, this slice is invisible, so
            //  the user really meant to tap on the body underneath,
            //  so we stop previewing and jump there We might try to
            //  figure out exactly which element was tapped somehow
            metaBook.stopPreview("slice_tapped",true);
            fdjtUI.cancel(evt);
            return;}
        if ((getParent(target,".ellipsis"))&&
            ((getParent(target,".elision"))||
             (getParent(target,".delision")))){
            fdjtUI.Ellipsis.toggle(target);
            fdjtUI.cancel(evt);
            return;}
        if (getParent(target,".tochead")) {
            var anchor=getParent(target,".tocref");
            var href=(anchor)&&(anchor.getAttribute("data-tocref"));
            metaBook.GoTOC(href);
            fdjtUI.cancel(evt);
            return;}
        var link=getParent(target,".mbmedia");
        if (link) {
            var src=link.getAttribute("data-src"), cancel=false;
            var type=link.getAttribute("data-type");
            if (hasClass(link,"imagelink")) {
                metaBook.showMedia(src,type); cancel=true;}
            else if ((hasClass(link,"audiolink"))||
                     (hasClass(link,"musiclink"))) {
                metaBook.showMedia(src,type); cancel=true;}
            else {}
            if (cancel) {
                fdjtUI.cancel(evt);
                return;}}
        var card=getCard(target);
        var passage=mbID(card.getAttribute("data-passage"));
        var glossid=card.getAttribute("data-gloss");
        var gloss=((glossid)&&(metaBook.glossdb.ref(glossid)));
        if (getParent(target,".glossbody")) {
            var detail=((gloss)&&(gloss.detail));
            if (!(detail)) return;
            else if (detail[0]==='<')
                fdjt.ID("METABOOKGLOSSDETAIL").innerHTML=gloss.detail;
            else if (detail.search(/^{(md|markdown)}/)===0) {
                var close=detail.indexOf('}');
                fdjt.ID("METABOOKGLOSSDETAIL").innerHTML=
                    metaBook.md2HTML(detail.slice(close+1));}
            else fdjt.ID("METABOOKGLOSSDETAIL").innerHTML=
                metaBook.md2HTML(detail);
            metaBook.setMode("glossdetail");
            return fdjtUI.cancel(evt);}
        else if ((!(gloss))&&(passage)) {
            metaBook.Skim(passage,card,0);
            return fdjtUI.cancel(evt);}
        else if ((gloss)&&(getParent(target,".tool"))) {
            var form=metaBook.setGlossTarget(gloss);           
            if (!(form)) return;
            metaBook.setMode("addgloss");
            return fdjtUI.cancel(evt);}
        else if (gloss) {
            metaBook.Skim(passage,card,0);
            return fdjtUI.cancel(evt);}
        else return;}
    function slice_held(evt){
        evt=evt||window.event;
        var slice_target=fdjtUI.T(evt), card=getCard(slice_target);
        if (Trace.gestures)
            fdjtLog("slice_held %o: %o, skimming=%o",
                    evt,card,metaBook.skimming);
        if (!(card)) return;
        // Put a clone of the card in the skimmer
        var clone=card.cloneNode(true);
        clone.id="METABOOKSKIM"; fdjtDOM.replace("METABOOKSKIM",clone);
        // If we're currently previewing something, clear it
        if (metaBook.previewTarget) {
            var drop=metaBook.getDups(metaBook.previewTarget);
            dropClass(drop,"metabookpreviewtarget");
            metaBook.clearHighlights(drop);
            metaBook.previewTarget=false;}

        // Get the attributes of this card
        var passageid=card.getAttribute("data-passage");
        var glossid=card.getAttribute("data-gloss");
        var gloss=((glossid)&&metaBook.glossdb.ref(glossid));
        var passage=mbID(passageid), show_target=false;
        var dups=metaBook.getDups(passageid);
        // Set up for preview
        metaBook.previewTarget=passage; addClass(dups,"metabookpreviewtarget");
        if ((gloss)&&(gloss.excerpt)) {
            // Highlight the gloss excerpt
            var range=metaBook.findExcerpt(dups,gloss.excerpt,gloss.exoff);
            if (range) {
                var starts=range.startContainer;
                if (!(getParent(starts,passage)))
                    // This is the case where the glosses excerpt
                    //  starts in a 'dup' generated by page layout
                    show_target=getTargetDup(starts,passage);
                fdjtUI.Highlight(range,"metabookhighlightexcerpt");}}

        if (getParent(card,".sbookresults")) {
            // It's a search result, so highlight any matching terms
            var terms=metaBook.query.tags;
            var info=metaBook.docinfo[passageid];
            // knodeterms match tags to their originating strings
            var spellings=info.knodeterms;
            var i=0; var lim=terms.length; while (i<lim) {
                var term=terms[i++];
                var highlights=highlightTerm(term,passage,info,spellings);
                if (!(show_target))
                    if ((highlights)&&(highlights.length)&&
                        (!(getParent(highlights[0],passage))))
                        show_target=getTargetDup(highlights[0],passage);}}
        metaBook.startPreview(show_target||passage,"slice_held");
        return fdjtUI.cancel(evt);}
    function slice_released(evt){
        var card=getCard(fdjtUI.T(evt||window.event));
        if (Trace.gestures) {
            fdjtLog("slice_released %o: %o, skimming=%o",evt,card);}
        metaBook.stopPreview("slice_released");}
    function slice_slipped(evt){
        evt=evt||window.event;
        var rel=evt.relatedTarget||fdjtUI.T(evt);
        if (!(hasParent(rel,".metabookslice"))) {
            if (slip_timer) return;
            slip_timer=setTimeout(function(){
                slip_timer=false;
                if (Trace.gestures)
                    fdjtLog("slice_slipped/timeout %o",evt);
                metaBook.stopPreview("slice_slipped");},
                                  500);}}
    function slice_touchtoo(evt){
        evt=evt||window.event;
        if (preview_timer) {
            clearTimeout(preview_timer); preview_timer=false;}
        if (!(metaBook.previewing)) return;
        else if (Trace.gestures) {
            fdjtLog("slice_touchtoo %o noabout",evt);
            metaBook.stopPreview("toc_touchtoo",true);}
        else {
            metaBook.stopPreview("toc_touchtoo",true);}
        fdjtUI.cancel(evt);}

    function getTargetDup(scan,target){
        var targetid=target.id;
        while (scan) {
            if (hasClass(scan,"codexpage")) return scan;
            else if ((scan.getAttribute)&&
                     ((scan.id===targetid)||
                      (scan.getAttribute("data-baseid")===targetid))) 
                return scan;
            else scan=scan.parentNode;}
        return target;}

    /* Highlighting terms in passages (for skimming, etc) */

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
            var pattern=new fdjtDOM.textRegExp(word,true,true);
            var dups=metaBook.getDups(target);
            var ranges=fdjtDOM.findMatches(dups,pattern);
            if (Trace.highlight)
                fdjtLog("Trying to highlight %s (using %o) in %o, ranges=%o",
                        word,pattern,target,ranges);
            if ((ranges)&&(ranges.length)) {
                var k=0; while (k<ranges.length) {
                    var h=fdjtUI.Highlight(
                        ranges[k++],"metabookhighlightsearch");
                    highlights=highlights.concat(h);}}}
        return highlights;}
    metaBook.highlightTerm=highlightTerm;

    /* Keyboard handlers */

    // We use keydown to handle navigation functions and keypress
    //  to handle mode changes
    function onkeydown(evt){
        evt=evt||window.event||null;
        var kc=evt.keyCode;
        var target=fdjtUI.T(evt);
        // fdjtLog("sbook_onkeydown %o",evt);
        if (evt.keyCode===27) { /* Escape works anywhere */
            if (metaBook.previewing) {
                metaBook.stopPreview("escape_key");
                fdjtUI.TapHold.clear();}
            dropClass(document.body,"mbZOOM");
            dropClass(document.body,"mbMEDIA");
            if (metaBook.mode==="addgloss") metaBook.cancelGloss();
            if (metaBook.mode) {
                metaBook.last_mode=metaBook.mode;
                metaBook.setMode(false);
                metaBook.setTarget(false);
                fdjtID("METABOOKSEARCHINPUT").blur();}
            else {}
            return;}
        else if ((target.tagName==="TEXTAREA")||
                 (target.tagName==="INPUT")||
                 (target.tagName==="BUTTON"))
            return;
        else if (hasClass(document.body,"mbZOOM"))
            return;
        else if ((metaBook.controlc)&&(evt.ctrlKey)&&((kc===99)||(kc===67))) {
            if (metaBook.previewing) metaBook.stopPreview("onkeydown",true);
            fdjtUI.TapHold.clear();
            metaBook.setMode("console");
            fdjt.UI.cancel(evt);}
        else if ((evt.altKey)||(evt.ctrlKey)||(evt.metaKey)) return true;
        else if (metaBook.previewing) {
            // Any key stops a preview and goes to the target
            metaBook.stopPreview("onkeydown",true);
            fdjtUI.TapHold.clear();
            metaBook.setHUD(false);
            fdjt.UI.cancel(evt);
            return false;}
        else if (hasClass(document.body,"mbCOVER")) {
            metaBook.clearStateDialog();
            metaBook.hideCover();
            fdjt.UI.cancel(evt);
            return false;}
        else if (metaBook.glossform) {
            var input=fdjt.DOM.getInput(metaBook.glossform,"NOTE");
            glossform_focus(metaBook.glossform);
            metaBook.setFocus(input); input.focus();
            var new_evt=document.createEvent("UIEvent");
            new_evt.initUIEvent("keydown",true,true,window);
            new_evt.keyCode=kc;
            input.dispatchEvent(new_evt);
            fdjtUI.cancel(evt);
            return;}
        else if (kc===34) metaBook.pageForward(evt);   /* page down */
        else if (kc===33) metaBook.pageBackward(evt);  /* page up */
        else if (kc===40) { /* arrow down */
            metaBook.setHUD(false);
            metaBook.pageForward(evt);}
        else if (kc===38) {  /* arrow up */
            metaBook.setHUD(false);
            metaBook.pageBackward(evt);}
        else if (kc===37) metaBook.skimBackward(evt); /* arrow left */
        else if (kc===39) metaBook.skimForward(evt); /* arrow right */
        // Don't interrupt text input for space, etc
        else if (fdjtDOM.isTextInput(fdjtDOM.T(evt))) return true;
        else if (kc===32) // Space
            metaBook.Forward(evt);
        // backspace or delete
        else if ((kc===8)||(kc===45))
            metaBook.Backward(evt);
        // Home goes to the current head.
        else if (kc===36) metaBook.JumpTo(metaBook.head);
        else if (metaBook.mode==="addgloss") {
            var mode=metaBook.getGlossMode();
            if (mode) return;
            var formdiv=fdjtID("METABOOKLIVEGLOSS");
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
        fdjtUI.cancel(evt);}

    // At one point, we had the shift key temporarily raise/lower the HUD.
    //  We might do it again, so we keep this definition around
    function onkeyup(evt){
        evt=evt||window.event||null;
        if (fdjtDOM.isTextInput(fdjtDOM.T(evt))) return true;
        else if ((evt.ctrlKey)||(evt.altKey)||(evt.metaKey)) return true;
        else {}}
    metaBook.UI.handlers.onkeyup=onkeyup;

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
        110: "overtoc",78: "overtoc",
        116: "statictoc",84: "statictoc", 72: "help", 
        103: "allglosses",71: "allglosses",
        67: "console", 99: "console"};

    // Handle mode changes
    function onkeypress(evt){
        var modearg=false; 
        evt=evt||window.event||null;
        var ch=evt.charCode||evt.keyCode;
        // metaBook.trace("sbook_onkeypress",evt);
        if (fdjtDOM.isTextInput(fdjtDOM.T(evt))) return true;
        else if ((evt.altKey)||(evt.ctrlKey)||(evt.metaKey)) return true;
        else if ((ch===72)||(ch===104)) { // 'H' or 'h'
            metaBook.clearStateDialog();
            metaBook.hideCover();
            fdjtDOM.toggleClass(document.body,'metabookhelp');
            return false;}
        else if ((ch===67)||(ch===99)) { // 'C' or 'c'
            metaBook.clearStateDialog();
            metaBook.toggleCover();
            return false;}
        else modearg=modechars[ch];
        if (modearg==="openheart")
            modearg=metaBook.last_heartmode||"about";
        var mode=metaBook.setMode();
        if (modearg) {
            if (mode===modearg) {
                metaBook.setMode(false); mode=false;}
            else {
                metaBook.setMode(modearg); mode=modearg;}}
        else {}
        if (mode==="searching")
            metaBook.setFocus(fdjtID("METABOOKSEARCHINPUT"));
        else metaBook.clearFocus(fdjtID("METABOOKSEARCHINPUT"));
        fdjtDOM.cancel(evt);}
    metaBook.UI.handlers.onkeypress=onkeypress;

    function goto_keypress(evt){
        evt=evt||window.event||null;
        var target=fdjtUI.T(evt);
        var ch=evt.charCode||evt.keyCode;
        var max=false; var min=false;
        var handled=false;
        if (target.name==='GOTOLOC') {
            min=0; max=Math.floor(metaBook.ends_at/128);}
        else if (target.name==='GOTOPAGE') {
            min=1; max=metaBook.pagecount;}
        else if (ch===13) fdjtUI.cancel(evt);
        if (ch===13) {
            if (target.name==='GOTOPAGE') {
                var num=parseInt(target.value,10);
                if (typeof num === 'number') {
                    handled=true; metaBook.GoToPage(num);}
                else {}}
            else if (target.name==='GOTOREF') {
                var pagemap=metaBook.layout.pagemap;
                var page=pagemap[target.value];
                if (page) {
                    metaBook.GoToPage(page); handled=true;}}
            else if (target.name==='GOTOLOC') {
                var locstring=target.value;
                var loc=parseFloat(locstring);
                if ((typeof loc === 'number')&&(loc>=0)&&(loc<=100)) {
                    loc=Math.floor((loc/100)*metaBook.ends_at)+1;
                    metaBook.JumpTo(loc); handled=true;}}
            else {}
            if (handled) {
                target.value="";
                metaBook.setMode(false);}}}
    metaBook.UI.goto_keypress=goto_keypress;

    function glossdeleted(response,glossid,frag){
        if (response===glossid) {
            metaBook.glossdb.drop(glossid);
            var editform=fdjtID("METABOOKEDITGLOSS_"+glossid);
            if (editform) {
                var editor=editform.parentNode;
                if (editor===fdjtID('METABOOKLIVEGLOSS')) {
                    metaBook.glosstarget=false;
                    metaBook.setMode(false);}
                fdjtDOM.remove(editor);}
            var renderings=fdjtDOM.Array(document.getElementsByName(glossid));
            var i=0; var lim=renderings.length;
            if (renderings) {
                while (i<lim) {
                    var rendering=renderings[i++];
                    if (rendering.id==='METABOOKSKIM')
                        fdjtDOM.replace(
                            rendering,fdjtDOM("div.metabookcard.deletedgloss"));
                    else fdjtDOM.remove(rendering);}}
            var glossmarks=
                document.getElementsByName("METABOOK_GLOSSMARK_"+frag);
            glossmarks=fdjtDOM.Array(glossmarks);
            i=0; lim=glossmarks.length; while (i<lim) {
                var glossmark=glossmarks[i++];
                var newglosses=RefDB.remove(glossmark.glosses,glossid);
                if (newglosses.length===0) fdjtDOM.remove(glossmark);
                else glossmark.glosses=newglosses;}
            var highlights=fdjtDOM.$(
                ".metabookuserexcerpt[data-glossid='"+glossid+"']");
            highlights=fdjtDOM.Array(highlights);
            i=0; lim=highlights.length; while (i<lim) {
                fdjtUI.Highlight.remove(highlights[i++]);}}
        else fdjtUI.alert(response);}

    function delete_gloss(uuid){
        var gloss=metaBook.glossdb.probe(uuid);
        // If this isn't defined, the gloss hasn't been saved so we
        //  don't try to delete it.
        if ((gloss)&&(gloss.created)&&(gloss.maker)) {
            var frag=gloss.get("frag");
            fdjt.Ajax.jsonCall(
                function(response){glossdeleted(response,uuid,frag);},
                "https://"+metaBook.server+"/1/delete",
                "gloss",uuid);}
        else if ((gloss)&&(gloss.frag)) {
            // This is the case where the gloss hasn't been saved
            //  or is an anonymous gloss by a non-logged in user
            glossdeleted(uuid,uuid,gloss.frag);}}
    
    function addoutlet_keydown(evt){
        evt=evt||window.event;
        var target=fdjtUI.T(evt);
        var content=target.value;
        var glossdiv=fdjtID("METABOOKLIVEGLOSS");
        if (!(glossdiv)) return;
        var form=getChild(glossdiv,"FORM");
        var share_cloud=metaBook.share_cloud;
        var ch=evt.keyCode||evt.charCode;
        if ((fdjtString.isEmpty(content))&&(ch===13)) {
            if (share_cloud.selection) 
                metaBook.addOutlet2Form(
                    form,share_cloud.selection.getAttribute("data-value"));
            else metaBook.setGlossMode("editnote");
            return;}
        else if ((ch===13)&&(share_cloud.selection)) {
            metaBook.addOutlet2Form(form,share_cloud.selection);
            share_cloud.complete("");
            target.value="";}
        else if (ch===13) {
            var completions=share_cloud.complete(content);
            if (completions.length)
                metaBook.addOutlet2Form(
                    form,completions[0].getAttribute("data-value"));
            else metaBook.addOutlet2Form(form,content);
            fdjtUI.cancel(evt);
            target.value="";
            share_cloud.complete("");}
        else if (ch===9) { /* tab */
            share_cloud.complete(content);
            fdjtUI.cancel(evt);
            if ((share_cloud.prefix)&&
                (share_cloud.prefix!==content)) {
                target.value=share_cloud.prefix;
                fdjtDOM.cancel(evt);
                setTimeout(function(){
                    metaBook.UI.updateScroller("METABOOKGLOSSOUTLETS");},
                           100);
                return;}
            else if (evt.shiftKey) share_cloud.selectPrevious();
            else share_cloud.selectNext();}
        else setTimeout(function(){
            share_cloud.complete(target.value);},
                        100);}

    function addtag_keydown(evt){
        evt=evt||window.event;
        var target=fdjtUI.T(evt);
        var content=target.value;
        var glossdiv=fdjtID("METABOOKLIVEGLOSS");
        if (!(glossdiv)) return;
        var form=getChild(glossdiv,"FORM");
        var gloss_cloud=metaBook.gloss_cloud;
        var ch=evt.keyCode||evt.charCode;
        if ((fdjtString.isEmpty(content))&&(ch===13)) {
            if (gloss_cloud.selection) 
                metaBook.addTag2Form(form,gloss_cloud.selection);
            else metaBook.setGlossMode(false);
            gloss_cloud.clearSelection();
            return;}
        else if ((ch===13)&&(gloss_cloud.selection)) {
            metaBook.addTag2Form(form,gloss_cloud.selection);
            gloss_cloud.complete("");
            gloss_cloud.clearSelection();
            target.value="";}
        else if (ch===13) {
            gloss_cloud.complete(content);
            if ((content.indexOf('|')>=0)||
                (content.indexOf('@')>=0))
                metaBook.addTag2Form(form,content);
            else metaBook.handleTagInput(content,form,true);
            fdjtUI.cancel(evt);
            target.value="";
            gloss_cloud.complete("");}
        else if (ch===9) { /* tab */
            gloss_cloud.complete(content);
            fdjtUI.cancel(evt);
            if ((gloss_cloud.prefix)&&
                (gloss_cloud.prefix!==content)) {
                target.value=gloss_cloud.prefix;
                fdjtDOM.cancel(evt);
                setTimeout(function(){
                    metaBook.UI.updateScroller("METABOOKGLOSSCLOUD");},
                           100);
                return;}
            else if (evt.shiftKey) gloss_cloud.selectPrevious();
            else gloss_cloud.selectNext();}
        else setTimeout(function(){
            gloss_cloud.complete(target.value);},
                        100);}

    var attach_types=/\b(uploading|linking|glossbody|image|audio|dropbox|gdrive|usebox)\b/g;
    function changeAttachment(evt){
        evt=evt||window.event;
        var target=fdjtUI.T(evt);
        var form=getParent(target,'form');
        var newtype=target.value;
        if (target.checked)
            fdjtDOM.swapClass(form,attach_types,newtype);
        else dropClass(form,target.value);}
    metaBook.UI.changeAttachment=changeAttachment;

    function setAttachType(newtype){
        var livegloss=fdjtID("METABOOKLIVEGLOSS");
        var form=fdjtDOM.getChild(livegloss,"FORM");
        fdjtDOM.swapClass(form,attach_types,newtype);
        var attachform=fdjtID("METABOOKATTACHFORM");
        var input=fdjtDOM.getInputFor(attachform,"ATTACHTYPE",newtype);
        fdjt.UI.CheckSpan.set(input,true);}
    metaBook.setAttachType=setAttachType;

    function attach_action(evt){
        var linkinput=fdjtID("METABOOKATTACHURL");
        var titleinput=fdjtID("METABOOKATTACHTITLE");
        var livegloss=fdjtID("METABOOKLIVEGLOSS");
        if (!(livegloss)) return;
        var form=getChild(livegloss,"FORM");
        metaBook.addLink2Form(form,linkinput.value,titleinput.value);
        linkinput.value="";
        titleinput.value="";
        metaBook.setGlossMode("editnote");
        fdjtUI.cancel(evt);}
    function attach_submit(evt){
        evt=evt||window.event;
        var form=fdjtUI.T(evt);
        var livegloss=fdjtID("METABOOKLIVEGLOSS");
        var liveglossid=fdjtDOM.getInput(livegloss,"UUID");
        var glossid=liveglossid.value;
        var linkinput=fdjtDOM.getInput(form,"URL");
        var fileinput=fdjtDOM.getInput(form,"UPLOAD");
        var glossidinput=fdjtDOM.getInput(form,"GLOSSID");
        var itemidinput=fdjtDOM.getInput(form,"ITEMID");
        var titleinput=fdjtDOM.getInput(form,"TITLE");
        var title=(titleinput.value)&&(fdjtString.stdspace(titleinput.value));
        var isokay=fdjtDOM.getInput(form,"FILEOKAY");
        var itemid=fdjt.State.getUUID();
        var path=linkinput.value;
        if (hasClass("METABOOKHUD","glossattach")) {
            if (!(fileinput.files.length)) {
                fdjtUI.cancel(evt);
                fdjtUI.alert("You need to specify a file!");
                return;}
            else path=fileinput.files[0].name;
            if (!(isokay.checked)) {
                fdjtUI.cancel(evt);
                fdjtUI.alert(
                    "You need to confirm that the file satisfies our restrictions!");
                return;}
            glossidinput.value=glossid;
            itemidinput.value=itemid;}
        else fdjtUI.cancel(evt);
        if (!(title)) {
            var namestart=((path.indexOf('/')>=0)?
                           (path.search(/\/[^\/]+$/)):(0));
            if (namestart<0) title="attachment";
            else title=path.slice(namestart);}
        if (!(livegloss)) return;
        var glossform=getChild(livegloss,"FORM");
        if (hasClass("METABOOKHUD","glossattach")) {
            var glossdata_url=
                "https://glossdata.sbooks.net/"+glossid+"/"+itemid+"/"+path;
            var commframe=fdjtID("METABOOKGLOSSCOMM");
            var listener=function(evt){
                evt=evt||window.event;
                metaBook.addLink2Form(glossform,glossdata_url,title);
                titleinput.value="";
                fileinput.value="";
                isokay.checked=false;
                fdjtDOM.removeListener(commframe,"load",listener);
                metaBook.submitGloss(glossform,true);
                metaBook.setGlossMode("editnote");};
            fdjtDOM.addListener(commframe,"load",listener);}
        else {
            metaBook.addLink2Form(glossform,linkinput.value,title);
            metaBook.setGlossMode("editnote");}}
    function attach_cancel(evt){
        var linkinput=fdjtID("METABOOKATTACHURL");
        var titleinput=fdjtID("METABOOKATTACHTITLE");
        var livegloss=fdjtID("METABOOKLIVEGLOSS");
        if (!(livegloss)) return;
        linkinput.value="";
        titleinput.value="";
        metaBook.setGlossMode("editnote");
        fdjtUI.cancel(evt);}
    function attach_keydown(evt){
        evt=evt||window.event;
        var ch=evt.keyCode||evt.charCode;
        if (ch!==13) return;
        fdjtUI.cancel(evt);
        var linkinput=fdjtID("METABOOKATTACHURL");
        var titleinput=fdjtID("METABOOKATTACHTITLE");
        var livegloss=fdjtID("METABOOKLIVEGLOSS");
        if (!(livegloss)) return;
        var form=getChild(livegloss,"FORM");
        metaBook.addLink2Form(form,linkinput.value,titleinput.value);
        linkinput.value="";
        titleinput.value="";
        metaBook.setGlossMode("editnote");}

    /* HUD button handling */

    function hudmodebutton(evt){
        evt=evt||window.event;
        var target=fdjtUI.T(evt);
        var mode=target.getAttribute("hudmode");
        if (Trace.gestures)
            fdjtLog("hudmodebutton() %o mode=%o cl=%o skim=%o sbh=%o mode=%o",
                    evt,mode,(isClickable(target)),
                    metaBook.skimming,metaBook.hudup,metaBook.setMode());
        metaBook.clearStateDialog();
        if (reticle.live) reticle.flash();
        fdjtUI.cancel(evt);
        if (!(mode)) return;
        if ((evt.type==='click')||
            (evt.type==='tap')||
            (evt.type==='release')) {
            dropClass(document.body,"_HOLDING");
            if ((metaBook.skimming)&&(!(metaBook.hudup))) {
                if ((mode==="refinesearch")||(mode==="searchresults")) {
                    metaBook.setMode("searchresults"); return;}
                else if (mode==="allglosses") {
                    metaBook.setMode("allglosses"); return;}}
            if (fdjtDOM.hasClass(metaBook.HUD,mode))
                metaBook.setMode(false,true);
            else if ((mode==="search")&&
                     (fdjtDOM.hasClass(metaBook.HUD,metaBook.searchModes)))
                metaBook.setMode(false,true);
            else metaBook.setMode(mode);}
        else if (evt.type==="tap")
            metaBook.setHUD(true);
        else if (evt.type==="hold") 
            addClass(document.body,"_HOLDING");
        else dropClass(document.body,"_HOLDING");}
    metaBook.UI.hudmodebutton=hudmodebutton;

    metaBook.UI.dropHUD=function(evt){
        var target=fdjtUI.T(evt);
        if (isClickable(target)) {
            if (Trace.gestures)
                fdjtLog("Clickable: don't dropHUD %o",evt);
            return;}
        if (Trace.gestures) fdjtLog("dropHUD %o",evt);
        fdjtUI.cancel(evt); metaBook.setMode(false);};

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
             (fdjt.ID(glossmark.name.slice(15))))||
            getTarget(glossmark.parentNode,true);
        if ((passage)&&(passage.getAttribute("data-baseid"))) 
            passage=mbID(passage.getAttribute("data-baseid"));
        if (Trace.gestures)
            fdjtLog("glossmark_tapped (%o) on %o gmark=%o passage=%o mode=%o target=%o",
                    evt,target,glossmark,passage,metaBook.mode,metaBook.target);
        if (!(glossmark)) return false;
        fdjtUI.cancel(evt);
        if ((metaBook.mode==='openglossmark')&&
            (metaBook.target===passage)) {
            metaBook.setMode(false);
            metaBook.clearGlossmark();
            return;}
        else if (metaBook.select_target) return;
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
                if (glossmark_image) fdjtUI.ImageSwap.reset(glossmark_image);}
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
                if (glossmark_image) fdjtUI.ImageSwap.reset(glossmark_image);
                glossmark_image=false;}}}

    function glossmark_hoverstart(evt){
        evt=evt||window.event;
        var target=fdjtUI.T(evt);
        var passage=getTarget(target);
        if (!(fdjtDOM.hasClass(passage,"metabooktarget")))
            animate_glossmark(target,true);}

    function glossmark_hoverdone(evt){
        evt=evt||window.event;
        var target=fdjtUI.T(evt);
        var passage=getTarget(target);
        if (!(fdjtDOM.hasClass(passage,"metabooktarget")))
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
        fdjtUI.cancel(evt);
        metaBook.forceSync();
        if (!(navigator.onLine))
            fdjtUI.alertFor(
                15,"You're currently offline; information will be synchronized when you're back online");
        else if (!(metaBook.connected))
            fdjtUI.alertFor(
                15,"You're not currently logged into sBooks.  Information will be synchronized when you've logged in.");
        else fdjtUI.alertFor(7,"Sychronizing glosses, etc with the remote server");
        return false;}
    metaBook.UI.forceSyncAction=forceSyncAction;


    /* Moving forward and backward */

    var last_motion=false;

    function forward(evt){
        if (!(evt)) evt=window.event||false;
        if (evt) fdjtUI.cancel(evt);
        if (Trace.nav)
            fdjtLog("Forward e=%o h=%o t=%o",evt,
                    metaBook.head,metaBook.target);
        if ((evt)&&(evt.shiftKey))
            skimForward(evt);
        else pageForward(evt);}
    metaBook.Forward=forward;
    function backward(evt){
        if (!(evt)) evt=window.event||false;
        if (evt) fdjtUI.cancel(evt);
        if (Trace.nav)
            fdjtLog("Backward e=%o h=%o t=%o",evt,
                    metaBook.head,metaBook.target);
        if ((evt)&&(evt.shiftKey))
            skimBackward();
        else pageBackward();}
    metaBook.Backward=backward;

    function preview_touchmove_nodefault(evt){
        if (metaBook.previewing) fdjtUI.noDefault(evt);}

    function pageForward(evt){
        evt=evt||window.event;
        dropClass(document.body,/\bmb(PAGE)?PREVIEW/g);
        var now=fdjtTime();
        if ((last_motion)&&((now-last_motion)<100)) return;
        else last_motion=now;
        dropClass(document.body,/\bmb(PAGE)?PREVIEW/g);
        if (metaBook.readsound)
            fdjtDOM.playAudio("METABOOKPAGEORWARDAUDIO");
        if ((Trace.gestures)||(Trace.flips))
            fdjtLog("pageForward (on %o) c=%o n=%o",
                    evt,metaBook.curpage,metaBook.pagecount);
        if ((metaBook.bypage)&&(typeof metaBook.curpage === "number")) {
            var pagemax=((metaBook.bypage)&&
                         ((metaBook.pagecount)||(metaBook.layout.pagenum-1)));
            var newpage=false;
            if (metaBook.curpage>=pagemax) {}
            else metaBook.GoToPage(
                newpage=metaBook.curpage+1,"pageForward",true,false);}
        else {
            var delta=fdjtDOM.viewHeight()-50;
            if (delta<0) delta=fdjtDOM.viewHeight();
            var newy=fdjtDOM.viewTop()+delta;
            window.scrollTo(fdjtDOM.viewLeft(),newy);}}
    metaBook.pageForward=pageForward;

    function pageBackward(evt){
        var now=fdjtTime();
        dropClass(document.body,/\bmb(PAGE)?PREVIEW/g);
        if ((last_motion)&&((now-last_motion)<100)) return;
        else last_motion=now;
        evt=evt||window.event;
        if (metaBook.readsound)
            fdjtDOM.playAudio("METABOOKPAGEBACKWARDAUDIO");
        if ((Trace.gestures)||(Trace.flips))
            fdjtLog("pageBackward (on %o) c=%o n=%o",
                    evt,metaBook.curpage,metaBook.pagecount);
        if ((metaBook.bypage)&&(typeof metaBook.curpage === "number")) {
            var newpage=false;
            if (metaBook.curpage===0) {}
            else {
                newpage=metaBook.curpage-1;
                metaBook.GoToPage(newpage,"pageBackward",true,false);}}
        else {
            var delta=fdjtDOM.viewHeight()-50;
            if (delta<0) delta=fdjtDOM.viewHeight();
            var newy=fdjtDOM.viewTop()-delta;
            window.scrollTo(fdjtDOM.viewLeft(),newy);}}
    metaBook.pageBackward=pageBackward;

    function skimForward(evt){
        var now=fdjtTime();
        dropClass(document.body,/\bmb(PAGE)?PREVIEW/g);
        if ((last_motion)&&((now-last_motion)<100)) return;
        else last_motion=now;
        evt=evt||window.event;
        if (metaBook.uisound)
            fdjtDOM.playAudio("METABOOKSKIMFORWARDAUDIO");
        if (hasClass(document.body,"mbSKIMMING")) {}
        else if (metaBook.mode==="openglossmark") {
            var ids=metaBook.docinfo._ids;
            var id=((metaBook.target)&&(metaBook.target.id));
            var glossdb=metaBook.glossdb;
            var i, lim=ids.length;
            if ((id)&&((i=RefDB.position(ids,id))>0)) {
                i++; while (i<lim) {
                    var g=glossdb.find('frag',ids[i]);
                    if ((g)&&(g.length)) {
                        var passage=mbID(ids[i]);
                        var glossmark=getChild(passage,".glossmark");
                        metaBook.GoTo(passage,"skimForward/glosses",true);
                        metaBook.showGlossmark(passage,glossmark);
                        return;}
                    else i++;}}
            metaBook.setMode(false);
            return;}
        else if (metaBook.skimming) {}
        else return; /* Need default */
        if (metaBook.uisound)
            fdjtDOM.playAudio("METABOOKSKIMFORWARDAUDIO");
        addClass("METABOOKSKIMMER","flash");
        addClass("METABOOKNEXTSKIM","flash");
        setTimeout(function(){
            dropClass("METABOOKSKIMMER","flash");
            dropClass("METABOOKNEXTSKIM","flash");},
                   200);
        if (metaBook.mode==="statictoc") {
            var head=metaBook.head;
            var headid=head.codexbaseid||head.id;
            var headinfo=metaBook.docinfo[headid];
            if (Trace.nav) 
                fdjtLog("skimForward/toc() head=%o info=%o n=%o h=%o",
                        head,headinfo,headinfo.next,headinfo.head);
            if (headinfo.next) metaBook.GoTo(headinfo.next.frag,"skimForward");
            else if ((headinfo.head)&&(headinfo.head.next)) 
                metaBook.GoTo(headinfo.head.next.frag,"skimForward");
            else if ((headinfo.head)&&(headinfo.head.head)&&
                     (headinfo.head.head.next)) 
                metaBook.GoTo(headinfo.head.head.next.frag,"skimForward");
            else metaBook.setMode(false);
            return;}
        if ((metaBook.skimpoints)&&
            ((metaBook.skimoff+1)<metaBook.skimpoints.length)) {
            metaBook.skimoff++;
            metaBook.GoTo(metaBook.skimpoints[metaBook.skimoff]);
            return;}
        var start=metaBook.skimming;
        var scan=metaBook.nextSlice(start);
        var ref=((scan)&&(metaBook.getRef(scan)));
        if ((Trace.gestures)||(Trace.flips)||(Trace.nav)) 
            fdjtLog("scanForward (on %o) from %o/%o to %o/%o under %o",
                    evt,start,metaBook.getRef(start),scan,ref,metaBook.skimming);
        if ((ref)&&(scan)) metaBook.Skim(ref,scan,1);
        return scan;}
    metaBook.skimForward=skimForward;

    function skimBackward(evt){
        var now=fdjtTime();
        dropClass(document.body,/\bmb(PAGE)?PREVIEW/g);
        if ((last_motion)&&((now-last_motion)<100)) return;
        else last_motion=now;
        if (metaBook.uisound)
            fdjtDOM.playAudio("METABOOKSKIMBACKWARDAUDIO");
        if (hasClass(document.body,"mbSKIMMING")) {}
        else if (metaBook.mode==="openglossmark") {
            var ids=metaBook.docinfo._ids;
            var id=((metaBook.target)&&(metaBook.target.id));
            var glossdb=metaBook.glossdb;
            var i=ids.length;
            if ((id)&&((i=RefDB.position(ids,id))>0)) {
                i--; while (i>=0) {
                    var g=glossdb.find('frag',ids[i]);
                    if ((g)&&(g.length)) {
                        var passage=mbID(ids[i]);
                        var glossmark=getChild(passage,".glossmark");
                        metaBook.GoTo(passage,"skimBackward/glosses",true);
                        metaBook.showGlossmark(passage,glossmark);
                        return;}
                    else i--;}}
            metaBook.setMode(false);
            return;}
        else if (metaBook.skimming) {}
        else return false;
        addClass("METABOOKPREVSKIM","flash");
        addClass("METABOOKSKIMMER","flash");
        setTimeout(function(){
            dropClass("METABOOKSKIMMER","flash");
            dropClass("METABOOKPREVSKIM","flash");},
                   200);
        if (metaBook.mode==="statictoc") {
            var head=metaBook.head;
            var headid=head.codexbaseid||head.id;
            var headinfo=metaBook.docinfo[headid];
            if (Trace.nav) 
                fdjtLog("skimBackward/toc() head=%o info=%o p=%o h=%o",
                        head,headinfo,headinfo.prev,headinfo.head);
            if (headinfo.prev) metaBook.GoTo(headinfo.prev.frag,"skimBackward");
            else if (headinfo.head) 
                metaBook.GoTo(headinfo.head.frag,"skimBackward");
            else metaBook.setMode(false);
            return;}
        if ((metaBook.skimpoints)&&(metaBook.skimoff>0)) {
            metaBook.skimoff--;
            metaBook.GoTo(metaBook.skimpoints[metaBook.skimoff]);
            return;}
        var start=metaBook.skimming;
        var scan=metaBook.prevSlice(start);
        var ref=((scan)&&(metaBook.getRef(scan)));
        if ((Trace.gestures)||(Trace.flips)||(Trace.nav))
            fdjtLog("skimBackward (on %o) from %o/%o to %o/%o under %o",
                    evt,start,metaBook.getRef(start),scan,ref,metaBook.skimming);
        if ((ref)&&(scan)) metaBook.Skim(ref,scan,-1);
        return scan;}
    metaBook.skimBackward=skimBackward;

    function skimmer_tapped(evt){
        evt=evt||window.event;
        var target=fdjtUI.T(evt);
        if (isClickable(target)) return;
        if ((getParent(target,".ellipsis"))&&
            ((getParent(target,".elision"))||
             (getParent(target,".delision")))){
            fdjtDOM.toggleClass("METABOOKSKIMMER","expanded");
            // fdjtUI.Ellipsis.toggle(target);
            fdjtUI.cancel(evt);
            return;}
        if ((getParent(target,".tool"))) {
            var card=getCard(target);
            if ((card)&&((card.name)||(card.getAttribute("name")))) {
                var name=(card.name)||(card.getAttribute("name"));
                var gloss=RefDB.resolve(name,metaBook.glossdb);
                if (!(gloss)) return;
                var form=metaBook.setGlossTarget(gloss);
                if (!(form)) return;
                metaBook.stopSkimming();
                metaBook.setMode("addgloss");
                return;}
            else return;}
        if (getParent(target,".tochead")) {
            var anchor=getParent(target,".tocref");
            var href=(anchor)&&(anchor.getAttribute("data-tocref"));
            if (href) metaBook.GoTOC(href);
            else toggleClass("METABOOKSKIMMER","expanded");}
        else toggleClass("METABOOKSKIMMER","expanded");
        fdjtUI.cancel(evt);
        return;}

    /* Entering page numbers and locations */

    function enterPageNum(evt) {
        evt=evt||window.event;
        if ((metaBook.hudup)||(metaBook.mode)||(metaBook.cxthelp)) {
            fdjtUI.cancel(evt);
            metaBook.setMode(false);
            return;}
        fdjtUI.cancel(evt);
        if (metaBook.hudup) {metaBook.setMode(false); return;}
        metaBook.setMode("gotopage",true);}
    function enterPageRef(evt) {
        evt=evt||window.event;
        if ((metaBook.hudup)||(metaBook.mode)||(metaBook.cxthelp)) {
            fdjtUI.cancel(evt);
            metaBook.setMode(false);
            return;}
        fdjtUI.cancel(evt);
        if (metaBook.hudup) {metaBook.setMode(false); return;}
        metaBook.setMode("gotoref",true);}
    function enterLocation(evt) {
        evt=evt||window.event;
        if ((metaBook.hudup)||(metaBook.mode)||(metaBook.cxthelp)) {
            fdjtUI.cancel(evt);
            metaBook.setMode(false);
            return;}
        fdjtUI.cancel(evt);
        if (metaBook.hudup) {metaBook.setMode(false); return;}
        metaBook.setMode("gotoloc",true);}
    function enterPercentage(evt) {
        evt=evt||window.event;
        if ((metaBook.hudup)||(metaBook.mode)||(metaBook.cxthelp)) {
            fdjtUI.cancel(evt);
            metaBook.setMode(false);
            return;}
        fdjtUI.cancel(evt);
        if (metaBook.hudup) {metaBook.setMode(false); return;}
        metaBook.setMode("gotoloc",true);}
    
    /* Other handlers */

    function flyleaf_tap(evt){
        if (isClickable(evt)) return;
        else metaBook.setMode(false);}

    function head_tap(evt){
        evt=evt||window.event;
        var target=fdjtUI.T(evt);
        if (Trace.gestures) fdjtLog("head_tap %o t=%o",evt,target);
        if (metaBook.previewing) {
            metaBook.stopPreview("head_tap");
            cancel(evt);
            return;}
        if (fdjtUI.isClickable(target)) return;
        if (!((target===metaBook.DOM.head)||
              (target===metaBook.DOM.tabs)))
            return;
        else if (metaBook.mode) {
            fdjtUI.cancel(evt);
            metaBook.setMode(false);}
        else if (fdjtDOM.hasClass(document.body,"mbSHOWHELP")) {
            fdjtUI.cancel(evt);
            fdjtDOM.dropClass(document.body,"mbSHOWHELP");}
        else if (metaBook.hudup) {
            fdjtUI.cancel(evt);
            metaBook.setMode(false);}
        else {
            fdjtUI.cancel(evt);
            metaBook.setMode(true);}}
    function foot_tap(evt){
        if (Trace.gestures) fdjtLog("foot_tap %o",evt);
        if (metaBook.previewing) {
            metaBook.stopPreview("foot_tap");
            cancel(evt);
            return;}
        if ((isClickable(evt))||(hasParent(fdjtUI.T(evt),"hudbutton")))
            return;
        else if ((metaBook.hudup)||(metaBook.mode)||(metaBook.cxthelp)) {
            fdjtUI.cancel(evt);
            metaBook.setMode(false);
            return;}}

    function getGoPage(target){
        return parseInt(target.innerHTML,10);}

    var previewing_page=false, preview_start_page=false;
    function pagebar_hold(evt,target){
        evt=evt||window.event; if (!(target)) target=fdjtUI.T(evt);
        var pagebar=fdjtID("METABOOKPAGEBAR");
        if (preview_timer) {
            clearTimeout(preview_timer);
            preview_timer=false;}
        if (((metaBook.hudup)||(metaBook.mode))&&
            (!(metaBook.fullheight))) {
            fdjtUI.cancel(evt);
            metaBook.setMode(false);
            return;}
        if (target.nodeType===3) target=target.parentNode;
        if (((hasParent(target,pagebar))&&(target.tagName!=="SPAN")))
            return;
        var gopage=getGoPage(target,evt);
        if ((Trace.gestures)||(hasClass(pagebar,"metabooktrace")))
            fdjtLog("pagebar_span_hold %o t=%o gopage: %o=>%o/%o, start=%o",
                    evt,target,previewing_page,gopage,metaBook.pagecount,
                    preview_start_page);
        if (!(preview_start_page)) preview_start_page=gopage;
        if (previewing_page===gopage) return;
        if (!(gopage)) {
            // fdjtLog.warn("Couldn't get page from METABOOKPAGEBAR");
            return;}
        if (previewing_page)
            pagebar.title=fdjtString(
                "Release to go to this page (%d), move away to return to page %d",
                gopage,metaBook.curpage);
        else pagebar.title=fdjtString(
            ((metaBook.touch)?
             ("Release to return to page %d, tap the content or margin to settle here (page %d)"):
             ("Release to return to page %d, tap a key to settle here (page %d)")),
            metaBook.curpage,gopage);
        previewing_page=gopage;
        metaBook.startPreview("CODEXPAGE"+previewing_page,"pagebar_span_hold/timeout");}
    function pagebar_tap(evt,target){
        evt=evt||window.event; if (!(target)) target=fdjtUI.T(evt);
        var pagebar=fdjtID("METABOOKPAGEBAR");
        if ((Trace.gestures)||(hasClass(pagebar,"metabooktrace")))
            fdjtLog("pagebar_tap %o",evt);
        if (preview_timer) {
            clearTimeout(preview_timer);
            preview_timer=false;}
        if ((metaBook.previewing)&&(!(previewing_page))) {
            metaBook.stopPreview("pagebar_tap",true);
            return;}
        if ((metaBook.hudup)||(metaBook.mode)||(metaBook.cxthelp)) {
            if (Trace.gestures)
                fdjtLog("clearHUD %s %s %s",metaBook.mode,
                        ((metaBook.hudup)?"hudup":""),
                        ((metaBook.cxthelp)?"hudup":""));
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
                    evt,metaBook.previewing,metaBook.previewTarget,
                    preview_start_page);
        if (preview_timer) {
            clearTimeout(preview_timer);
            preview_timer=false;}
        if (target.nodeType===3) target=target.parentNode;
        if (!(metaBook.previewing)) {preview_start_page=false; return;}
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
        if (preview_timer) {
            clearTimeout(preview_timer);
            preview_timer=false;}
        if ((Trace.gestures)||(hasClass(pagebar,"metabooktrace")))
            fdjtLog("pagebar_slip %o, previewing=%o, target=%o start=%o",
                    evt,metaBook.previewing,metaBook.previewTarget,
                    preview_start_page);
        if (!(metaBook.previewing)) return;
        if ((rel)&&(hasParent(rel,metaBook.body)))
            preview_timer=setTimeout(function(){
                var pagebar=fdjtID("METABOOKPAGEBAR");
                pagebar.title=""; preview_timer=false;
                metaBook.GoTo(rel,evt);},
                                     400);
        else preview_timer=setTimeout(function(){
            var pagebar=fdjtID("METABOOKPAGEBAR");
            pagebar.title=""; preview_timer=false;
            dropClass(target,"preview");
            metaBook.stopPagePreview("pagebar_slip/timeout");},
                                      400);
        previewing_page=false;}
    function pagebar_touchtoo(evt,target){
        evt=evt||window.event; if (!(target)) target=fdjtUI.T(evt);
        if (metaBook.previewing) {
            metaBook.stopPreview("touchtoo");
            fdjtUI.TapHold.clear();
            metaBook.setHUD(false);
            fdjt.UI.cancel(evt);
            return false;}}
    
    /* Gloss form handlers */

    /**** Clicking on outlets *****/
    
    function glossform_outlets_tapped(evt){
        evt=evt||window.event;
        var target=fdjtUI.T(evt);
        if (getParent(target,".checkspan"))
            return fdjt.UI.CheckSpan.onclick(evt);
        else if (getParent(target,".sharing"))
            toggleClass(getParent(target,".sharing"),"expanded");
        else {}}
    metaBook.UI.glossform_outlets_tapped=glossform_outlets_tapped;

    function outlet_select(evt){
        var target=fdjtUI.T(evt);
        var outletspan=getParent(target,'.outlet')||
            getParent(target,'.source');
        if (!(outletspan)) return;
        var live=fdjtID("METABOOKLIVEGLOSS");
        var form=((live)&&(getChild(live,"form")));
        var outlet=metaBook.share_cloud.getValue(outletspan);
        metaBook.addOutlet2Form(form,outlet);
        fdjtUI.cancel(evt);}

    /* The addgloss menu */

    var slip_timeout=false;

    function glossmode_tap(evt){
        evt=evt||window.event;
        var target=fdjtUI.T(evt);
        var alt=target.alt;
        
        if (!(alt)) return;

        var menu=getParent(target,'.addglossmenu');
        var form=getParent(target,'form');
        var div=getParent(form,"div.metabookglossform");
        
        if (alt==="downmenu") {
            addClass(menu,"expanded");
            dropClass(menu,"held");}
        else if (alt==="upmenu") {
            dropClass(menu,"expanded");
            dropClass(menu,"held");}
        else if (alt==="glossdelete") 
            addgloss_delete(menu,form,false,true);
        else if (alt==="glosscancel") 
            addgloss_cancel(menu,form,div);
        else if (alt==="glosspush") {
            metaBook.submitGloss(form,false);
            dropClass(menu,"expanded");}
        else if (alt==="glossupdate") {
            metaBook.submitGloss(form,false);
            dropClass(menu,"expanded");}
        else if (alt==="glossrespond") 
            addgloss_respond(menu,form);
        else if (alt==="glosscancel") {
            addgloss_cancel(menu,form,div);}
        else if (alt===form.className) {
            metaBook.setGlossMode(false,form);
            dropClass(menu,"expanded");}
        else if (metaBook.glossmodes.exec(alt)) {
            metaBook.setGlossMode(alt,form);
            dropClass(menu,"expanded");}
        else fdjtLog.warn("Bad alt=%s in glossmode_tap",alt);
        fdjtUI.cancel(evt);
        return;}

    function glossmode_hold(evt){
        evt=evt||window.event;
        var target=fdjtUI.T(evt);
        var alt=target.alt;
        
        if (!(alt)) return;

        if (slip_timeout) {
            clearTimeout(slip_timeout);
            slip_timeout=false;}

        var menu=getParent(target,'.addglossmenu');
        
        if (hasClass(menu,"expanded")) {
            addClass(menu,"held");
            addClass(target,"held");}
        else {
            addClass(menu,"expanded");
            addClass(menu,"held");}}

    function glossmode_release(evt) {
        evt=evt||window.event;
        var target=fdjtUI.T(evt);
        var menu=getParent(target,'.addglossmenu');
        var form=getParent(target,'form');
        var div=getParent(form,"div.metabookglossform");
        var alt=target.alt;
        dropClass(target,"held");
        if (hasClass(target,"menutop")) {
            metaBook.setGlossMode(false,form);}
        else if (alt==="glossdelete") 
            addgloss_delete(menu,form);
        else if (alt==="glosscancel") 
            addgloss_cancel(menu,form,div);
        else if (alt==="glosspush")
            metaBook.submitGloss(form,false);
        else if (alt==="glossupdate") {
            metaBook.submitGloss(form,false);}
        else if (alt==="glossrespond") 
            addgloss_respond(menu,form);
        else if (metaBook.glossmodes.exec(alt))
            metaBook.setGlossMode(alt,form);
        else fdjtLog.warn("Bad alt=%s in glossmode_release",alt);
        dropClass(menu,"expanded");
        dropClass(menu,"held");}

    function glossmode_slip(evt) {
        evt=evt||window.event;
        var target=fdjtUI.T(evt);
        var menu=getParent(target,'.addglossmenu');
        dropClass(target,"held");
        if (!(slip_timeout)) {
            slip_timeout=setTimeout(function(){
                dropClass(menu,"expanded");},
                                    500);}}

    function addgloss_delete(menu,form,div,noprompt){
        if (!(form)) form=getParent(menu,"FORM");
        if (!(div)) div=getParent(form,".metabookglossform");
        var modified=fdjtDOM.hasClass(div,"modified");
        // This keeps it from being saved when it loses the focus
        dropClass(div,"modified");
        dropClass(menu,"expanded");
        var uuid=getInputValues(form,"UUID")[0];
        var gloss=metaBook.glossdb.probe(uuid);
        if ((!(gloss))||(!(gloss.created))) {
            delete_gloss(uuid);
            metaBook.setMode(false);
            fdjtDOM.remove(div);
            metaBook.setGlossTarget(false);
            metaBook.setTarget(false);
            return;}
        if (noprompt) {
            delete_gloss(uuid);
            metaBook.setMode(false);
            fdjtDOM.remove(div);
            metaBook.setGlossTarget(false);
            metaBook.setTarget(false);
            return;}
        fdjt.UI.choose([{label: "Delete",
                         handler: function(){
                             delete_gloss(uuid);
                             metaBook.setMode(false);
                             fdjtDOM.remove(div);
                             metaBook.setGlossTarget(false);
                             metaBook.setTarget(false);},
                         isdefault: true},
                        {label: "Cancel"}],
                       ((modified)?
                        ("Delete this gloss?  Discard your changes?"):
                        ("Delete this gloss?")),
                       fdjtDOM(
                           "div.smaller",
                           "(Created ",
                           fdjtTime.shortString(gloss.created),
                           ")"));}

    function addgloss_cancel(menu,form,div){
        if (!(form)) form=getParent(menu,"FORM");
        if (!(div)) div=getParent(form,".metabookglossform");
        metaBook.cancelGloss();
        metaBook.setMode(false);
        fdjtDOM.remove(div);
        metaBook.setGlossTarget(false);
        metaBook.setTarget(false);
        return;}

    function addgloss_respond(target){
        var block=getParent(target,".metabookglossform");
        if (!(block)) return;
        var glosselt=getInput(block,'UUID');
        if (!(glosselt)) return;
        var qref=glosselt.value;
        var gloss=metaBook.glossdb.probe(qref);
        if (!(gloss)) return;
        var form=metaBook.setGlossTarget(gloss,metaBook.getGlossForm(gloss,true));
        if (!(form)) return;
        metaBook.setMode("addgloss");}
    
    /* Changing gloss networks */
    
    function changeGlossNetwork(evt){
        evt=evt||window.event;
        var target=fdjtUI.T(evt);
        var alternate=fdjtID(
            (fdjtDOM.hasParent(target,".metabookglossform"))?
                ("METABOOKNETWORKBUTTONS"):(("METABOOKLIVEGLOSS")));
        var doppels=getInputsFor(alternate,'NETWORK',target.value);
        fdjtUI.CheckSpan.set(doppels,target.checked);}
    metaBook.UI.changeGlossNetwork=changeGlossNetwork;

    function changeGlossPosting(evt){
        var target=fdjtUI.T(evt=(evt||window.event));
        var glossdiv=getParent(target,".metabookglossform");
        if (target.checked) fdjtDOM.addClass(glossdiv,"posted");
        else fdjtDOM.dropClass(glossdiv,"posted");}
    metaBook.UI.changeGlossPosting=changeGlossPosting;

    function changeGlossPrivacy(evt){
        evt=evt||window.event;
        var target=fdjtUI.T(evt=(evt||window.event));
        var glossdiv=getParent(target,".metabookglossform");
        var postgloss=getChild(glossdiv,".postgloss");
        var postinput=(postgloss)&&(getInput(postgloss,"POSTGLOSS"));
        if (postgloss) {
            if (target.checked) {
                if (postinput) postinput.disabled=true;}
            else {
                if (postinput) postinput.disabled=false;}}
        if (target.checked) fdjtDOM.addClass(glossdiv,"private");
        else fdjtDOM.dropClass(glossdiv,"private");}
    metaBook.UI.changeGlossPrivacy=changeGlossPrivacy;

    function exposureClicked(evt){
        evt=evt||window.event;
        var target=fdjtUI.T(evt);
        var form=getParent(target,"FORM");
        if (form.className==="addoutlet")
            fdjt.UI.CheckSpan.onclick(evt);
        else metaBook.setGlossMode("addoutlet");}
    metaBook.UI.exposureClicked=exposureClicked;

    /* Back to the text */

    function back_to_reading(evt){
        evt=evt||window.event;
        fdjtUI.cancel(evt);
        if (metaBook.mode==="addgloss") 
            metaBook.cancelGloss();
        metaBook.setMode(false);
        fdjtDOM.dropClass(document.body,"mbSHOWHELP");}

    function clearMode(evt){
        evt=evt||window.event; metaBook.setMode(false);}

    /* Tracking text input */

    function setFocus(target){
        if (!(target)) {
            var cur=metaBook.textinput;
            metaBook.textinput=false;
            metaBook.freezelayout=false;
            if (cur) cur.blur();
            return;}
        else if (metaBook.textinput===target) return;
        else {
            metaBook.textinput=target;
            metaBook.freezelayout=true;
            target.focus();}}
    metaBook.setFocus=setFocus;
    function clearFocus(target){
        if (!(target)) target=metaBook.textinput;
        if ((target)&&(metaBook.textinput===target)) {
            metaBook.textinput=false;
            metaBook.freezelayout=false;
            target.blur();}}
    metaBook.clearFocus=clearFocus;

    function metabookfocus(evt){
        evt=evt||window.event;
        var target=fdjtUI.T(evt);
        var input=getParent(target,'textarea');
        if (!(input)) input=getParent(target,'input');
        if ((!(input))||(typeof input.type !== "string")||
            (input.type.search(fdjtDOM.text_types)!==0))
            return;
        setFocus(input);}
    metaBook.UI.focus=metabookfocus;
    function metabookblur(evt){
        evt=evt||window.event;
        var target=((evt.nodeType)?(evt):(fdjtUI.T(evt)));
        var input=getParent(target,'textarea');
        if (!(input)) input=getParent(target,'input');
        if ((!(input))||(typeof input.type !== "string")||
            (input.type.search(fdjtDOM.text_types)!==0))
            return;
        clearFocus(input);}
    metaBook.UI.blur=metabookblur;

    /* Rules */

    var noDefault=fdjt.UI.noDefault;
    var cancel=fdjtUI.cancel;
    
    function generic_cancel(evt){
        evt=evt||window.event;
        var target=fdjtUI.T(evt);
        if (fdjtUI.isClickable(target)) return;
        else cancel(evt);}

    function setHelp(flag){
        if (flag) {
            fdjtDOM.addClass(document.body,"mbSHOWHELP");
            metaBook.cxthelp=true;}
        else {
            fdjtDOM.dropClass(document.body,"mbSHOWHELP");
            metaBook.cxthelp=false;}
        return false;}
    metaBook.setHelp=setHelp;
    
    function toggleHelp(evt){
        evt=evt||window.event;
        fdjtUI.cancel(evt);
        if (metaBook.cxthelp) {
            fdjtDOM.dropClass(document.body,"mbSHOWHELP");
            metaBook.cxthelp=false;}
        else {
            fdjtDOM.addClass(document.body,"mbSHOWHELP");
            metaBook.cxthelp=true;}
        return false;}
    metaBook.toggleHelp=toggleHelp;

    function editglossnote(evt){
        evt=evt||window.event;
        metaBook.setGlossMode("editnote");
        fdjtUI.cancel(evt);}

    function handleXTarget(evt){
        evt=evt||window.event;
        var anchor=fdjtUI.T(evt);
        if ((anchor.href)&&(anchor.href[0]==='#')&&
            (metaBook.xtargets[anchor.href.slice(1)])) {
            var fn=metaBook.xtargets[anchor.href.slice(1)];
            fdjtUI.cancel(evt);
            fn();}}

    function unhighlightSettings(){
        dropClass(fdjtDOM.$(".metabookhighlightsetting"),"metabookhighlightsetting");}
    function highlightSetting(id,evt){
        var setting=fdjtID(id);
        if (evt) fdjt.UI.cancel(evt);
        if (!(id)) {
            fdjtLog.warn("Couldn't resolve setting %s",id);
            dropClass(fdjtDOM.$(".metabookhighlightsetting"),"metabookhighlightsetting");
            metaBook.setMode("device");
            return;}
        addClass(setting,"metabookhighlightsetting");
        if (metaBook.mode!=="device") {
            if (metaBook.popmode) {
                var fn=metaBook.popmode; metaBook.popmode=unhighlightSettings(); fn();}
            metaBook.setMode("device");}}
    metaBook.UI.highlightSetting=highlightSetting;

    function showcover_tapped(evt){
        evt=evt||window.event;
        if ((metaBook.touch)&&(!(metaBook.hudup))) return;
        if (!((evt.shiftKey)||((evt.touches)&&(evt.touches.length>=2)))) {
            var opened=metaBook.readLocal("metabook.opened("+metaBook.docuri+")",true);
            if ((opened)&&((opened-fdjtTime())>(60*10*1000))) {
                if (fdjtID("METABOOKCOVERHOLDER"))
                    fdjtID("METABOOKCOVER").className="bookcover";
                else fdjtID("METABOOKCOVER").className="titlepage";}}
        metaBook.clearStateDialog();
        metaBook.showCover();
        fdjtUI.cancel(evt);}
    function showcover_released(evt){
        evt=evt||window.event;
        if (!((evt.shiftKey)||((evt.touches)&&(evt.touches.length>=2))))
            fdjtID("METABOOKCOVER").className="bookcover";
        metaBook.clearStateDialog();
        metaBook.showCover();
        fdjtUI.cancel(evt);}

    function global_mouseup(evt){
        evt=evt||window.event;
        if (metaBook.zoomed) return;
        if (metaBook.page_turner) {
            clearInterval(metaBook.page_turner);
            metaBook.page_turner=false;
            return;}
        if (metaBook.select_target) {
            startAddGloss(metaBook.select_target,
                          ((evt.shiftKey)&&("addtag")),evt);
            metaBook.select_target=false;}}
    
    function raiseHUD(evt){
        evt=evt||window.event;
        metaBook.setHUD(true);
        fdjt.UI.cancel(evt);
        return false;}
    metaBook.raiseHUD=raiseHUD;
    function lowerHUD(evt){
        evt=evt||window.event;
        metaBook.setHUD(false);
        fdjt.UI.cancel(evt);
        return false;}
    metaBook.lowerHUD=lowerHUD;

    function addGlossDragOK(evt){
        evt=evt||window.event;
        var types=evt.dataTransfer.types;
        if (!(types)) return;
        else if (types.indexOf("text/uri-list")>=0)
            fdjt.UI.cancel(evt);
        else if (types.indexOf("text/plain")>=0) {
            var text=evt.dataTransfer.getData("text/plain");
            if (text.search(/^\s*https?:\/\//)===0)
                fdjt.UI.cancel(evt);}
        else {}}
    function addGlossDrop(evt){
        evt=evt||window.event;
        var types=evt.dataTransfer.types;
        if (!(types)) return;
        else if (types.indexOf("text/uri-list")>=0) {
            var url=evt.dataTransfer.getData("URL");
            if (!(url)) return;
            fdjt.UI.cancel(evt);
            metaBook.setGlossMode("attach");
            setAttachType("linking");
            fdjt.ID("METABOOKATTACHURL").value=url;
            fdjt.ID("METABOOKATTACHTITLE").focus();}
        else if (types.indexOf("text/plain")>=0) {
            var text=evt.dataTransfer.getData("text/plain");
            fdjt.UI.cancel(evt);
            if (text.search(/^\s*https?:\/\//)===0) {
                metaBook.setGlossMode("attach");
                setAttachType("linking");
                fdjt.ID("METABOOKATTACHURL").value=text;
                fdjt.ID("METABOOKATTACHTITLE").focus();}
            else {
                var livegloss=fdjt.ID("METABOOKLIVEGLOSS");
                var input=fdjtDOM.getInput(livegloss,"NOTE");
                metaBook.setGlossMode(false);
                input.value=text;
                input.focus();}}
        else {}}

    function saveGloss(evt){
        evt=evt||window.event; metaBook.submitGloss();}
    function refreshLayout(evt){
        evt=evt||window.event; cancel(evt); metaBook.refreshLayout();}
    function resetState(evt){
        evt=evt||window.event; cancel(evt); metaBook.resetState();}
    function refreshOffline(evt){
        evt=evt||window.event; cancel(evt); metaBook.refreshOffline();}
    function clearOffline(evt){
        evt=evt||window.event; cancel(evt); metaBook.clearOffline();}
    function consolefn(evt){
        evt=evt||window.event; metaBook.consolefn(evt);}
    function saveSettings(evt){
        evt=evt||window.event; metaBook.UI.settingsSave(evt);}
    function applySettings(evt){
        evt=evt||window.event; metaBook.UI.settingsOK(evt);}
    function resetSettings(evt){
        evt=evt||window.event; metaBook.UI.settingsReset(evt);}
    function updateSettings(evt){
        evt=evt||window.event; metaBook.UI.settingsUpdate(evt);}

    function glossetc_touch(evt){
        var target=fdjtUI.T(evt);
        fdjtUI.CheckSpan.onclick(evt);
        var form=getParent(target,"form");
        var input=getInput(form,"NOTE");
        input.focus();}

    fdjt.DOM.defListeners(
        metaBook.UI.handlers.mouse,
        {window: {
            keyup: onkeyup,
            keydown: onkeydown,
            keypress: onkeypress,
            focus: metabookfocus,
            blur: metabookblur},
         "#METABOOKBODY": {
             mouseup: global_mouseup},
         content: {tap: body_tapped,
                   taptap: body_taptap,
                   hold: body_held,
                   release: body_released,
                   mousedown: body_touchstart,
                   mouseup: body_touchend,
                   click: cancel},
         toc: {tap: toc_tapped,hold: toc_held,
               release: toc_released, slip: toc_slipped,
               mouseover: fdjtUI.CoHi.onmouseover,
               mouseout: fdjtUI.CoHi.onmouseout,
               click: cancel},
         glossmark: {mouseup: glossmark_tapped,
                     click: cancel, mousedown: cancel,
                     mouseover: glossmark_hoverstart,
                     mouseout: glossmark_hoverdone},
         glossbutton: {mouseup: glossbutton_ontap,mousedown: cancel},
         summary: {tap: slice_tapped, hold: slice_held,
                   release: slice_released, click: generic_cancel,
                   slip: slice_slipped},
         hud: {click: handleXTarget, tap: handleXTarget},
         "#METABOOKSTARTPAGE": {click: metaBook.UI.dropHUD},
         "#METABOOKTOPBAR": {tap: raiseHUD},
         /*
         "#METABOOKTOOLTAB": {
             mousedown: cancel,
             mousemove: cancel,
             mouseup: raiseHUD}, */
         "#METABOOKSHOWCOVER": {
             tap: showcover_tapped, release: showcover_released},
         "#METABOOKHUDHELP": {click: metaBook.UI.dropHUD},
         ".helphud": {click: metaBook.UI.dropHUD},
         ".metabookheart": {tap: flyleaf_tap},
         "#METABOOKPAGEBAR": {
             tap: pagebar_tap,
             hold: pagebar_hold,
             release: pagebar_release,
             slip: pagebar_slip,
             click: cancel},
         "#METABOOKPAGEREFTEXT": {tap: enterPageRef},
         "#METABOOKPAGENOTEXT": {tap: enterPageNum},
         "#METABOOKLOCPCT": {tap: enterPercentage},
         "#METABOOKLOCOFF": {tap: enterLocation},
         // Return to skimmer
         "#METABOOKSKIMMER": {tap: skimmer_tapped},
         // Expanding/contracting the skimmer
         // Raise and lower HUD
         "#METABOOKPAGEHEAD": {click: head_tap},
         "#METABOOKTABS": {click: head_tap},
         "#METABOOKHEAD": {click: head_tap},
         "#METABOOKPAGEFOOT": {tap: foot_tap},
         "#METABOOKADDTAGINPUT": {keydown: addtag_keydown},
         "#METABOOKADDSHAREINPUT": {keydown: addoutlet_keydown},
         "#METABOOKATTACHFORM": {submit: attach_submit},
         "#METABOOKATTACHURL": {keydown: attach_keydown},
         "#METABOOKATTACHTITLE": {keydown: attach_keydown},
         "#METABOOKATTACHOK": {click: attach_action},
         "#METABOOKATTACHCANCEL": {click: attach_cancel},
         "#METABOOKADDGLOSS": {
             dragenter: addGlossDragOK,
             dragover: addGlossDragOK,
             drop: addGlossDrop},
         "#METABOOKGLOSSCLOUD": {
             tap: metaBook.UI.handlers.glosscloud_select,
             release: metaBook.UI.handlers.glosscloud_select},
         "#METABOOKSHARECLOUD": {
             tap: outlet_select,release: outlet_select},
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
         "#METABOOKNEXTPAGE": {click: function(evt){
             metaBook.pageForward(evt); cancel(evt);}},
         "#METABOOKPREVPAGE": {click: function(evt){
             metaBook.pageBackward(evt); cancel(evt);}},
         "#METABOOKNEXTSKIM": {click: function(evt){
             metaBook.skimForward(evt); cancel(evt);}},
         "#METABOOKPREVSKIM": {click: function(evt){
             metaBook.skimBackward(evt); cancel(evt);}},
         "#METABOOKSHOWTEXT": {click: back_to_reading},
         "#METABOOKGLOSSDETAIL": {click: metaBook.UI.dropHUD},
         "#METABOOKNOTETEXT": {click: jumpToNote},
         ".hudmodebutton": {
             tap: hudmodebutton,hold: hudmodebutton,
             slip: hudmodebutton,release: hudmodebutton},
         ".hudbutton[alt='save gloss']": {
             tap: saveGloss,hold: saveGloss},
         // GLOSSFORM rules
         ".metabookglossform": {click: glossform_touch,touchstart: glossform_touch},
         "span.metabooksharegloss": {
             tap: fdjt.UI.CheckSpan.onclick},
         ".metabookclosehud": {click: back_to_reading},
         ".metabookglossform .response": {click: metaBook.toggleHUD},
         ".addglossmenu": {
             tap: glossmode_tap,
             hold: glossmode_hold,
             slip: glossmode_slip,
             release: glossmode_release,
             click: cancel},
         "div.glossetc": {},
         "div.glossetc div.sharing": {click: glossform_outlets_tapped},
         "div.glossetc div.notetext": {click: editglossnote},
         // For checkspans
         ".metabookglossform, #METABOOKSETTINGS": {click: fdjt.UI.CheckSpan.onclick},
         ".metabooktogglehelp": {click: toggleHelp},
         "#METABOOKCONSOLETEXTINPUT": {
             focus: function(){fdjt.DOM.addClass('METABOOKCONSOLEINPUT','uptop');},
             blur: function(){fdjt.DOM.dropClass('METABOOKCONSOLEINPUT','uptop');}},
         "#METABOOKCONSOLEBUTTON": {click: consolefn},
         "#METABOOKSAVESETTINGS": {click: saveSettings},
         "#METABOOKAPPLYSETTINGS": {click: applySettings},
         // "#METABOOKWIPE": {click: wipeBook},
         "#METABOOKRESETSETTINGS": {click: resetSettings},
         "#METABOOKSETTINGSTABLE": {},
         "#METABOOKREFRESHOFFLINE": {click: refreshOffline},
         "#METABOOKREFRESHLAYOUT": {click: refreshLayout},
         "#METABOOKRESETSYNC": {click: resetState},
         ".clearoffline": {click: clearOffline},
         ".metabookclearmode": {click: clearMode},
         "#METABOOKGOTOREFHELP": {click: clearMode},
         "#METABOOKGOTOPAGEHELP": {click: clearMode},
         "#METABOOKGOTOLOCHELP": {click: clearMode},
         ".metabookshowsearch": {click: function(evt){
             metaBook.showSearchResults(); fdjt.UI.cancel(evt);}},
         ".metabookrefinesearch": {click: function(evt){
             metaBook.setMode('refinesearch'); fdjt.UI.cancel(evt);}},
         ".metabookexpandsearch": {click: function(evt){
             metaBook.setMode('expandsearch'); fdjt.UI.cancel(evt);}},
         ".metabookclearsearch": {click: function(evt){
             evt=evt||window.event;
             metaBook.UI.handlers.clearSearch(evt);
             fdjt.UI.cancel(evt);
             return false;}},
         "#METABOOKSEARCHINFO": { click: metaBook.searchTags_onclick },
         "#METABOOKSOURCES": {
             click: metaBook.UI.handlers.sources_ontap},
         "#METABOOKSOURCES .button.everyone": {
             click: function(evt){
                 evt=evt||window.event;
                 metaBook.UI.handlers.everyone_ontap(evt);
                 fdjt.UI.cancel(event);}}});

    fdjt.DOM.defListeners(
        metaBook.UI.handlers.touch,
        {window: {
            keyup: onkeyup,
            keydown: onkeydown,
            keypress: onkeypress,
            touchmove: preview_touchmove_nodefault,
            focus: metabookfocus,
            blur: metabookblur},
         content: {tap: body_tapped,
                   hold: body_held,
                   taptap: body_taptap,
                   release: body_released,
                   swipe: body_swiped,
                   touchstart: body_touchstart,
                   touchend: body_touchend,
                   touchmove: noDefault,
                   click: body_click},
         hud: {touchend: handleXTarget, tap: handleXTarget},
         toc: {tap: toc_tapped,hold: toc_held,
               slip: toc_slipped, release: toc_released,
               touchtoo: toc_touchtoo,
               touchmove: preview_touchmove_nodefault},
         glossmark: {touchstart: glossmark_tapped,touchend: cancel},
         // glossbutton: {mouseup: glossbutton_ontap,mousedown: cancel},
         summary: {tap: slice_tapped,
                   hold: slice_held,
                   release: slice_released,
                   touchtoo: slice_touchtoo,
                   touchmove: preview_touchmove_nodefault,
                   slip: slice_slipped},
         "#METABOOKSTARTPAGE": {touchend: metaBook.UI.dropHUD},
         "#METABOOKTOPBAR": {tap: raiseHUD},
         /*
         "#METABOOKTOOLTAB": {
             touchstart: cancel,
             touchmove: cancel,
             touchend: raiseHUD}, */
         "#METABOOKSHOWCOVER": {
             tap: showcover_tapped, release: showcover_released},
         "#METABOOKSOURCES": {
             touchstart: cancel,
             touchend: metaBook.UI.handlers.sources_ontap},
         "#METABOOKSEARCHINFO": { click: metaBook.searchTags_onclick },
         "#METABOOKPAGEFOOT": {},
         "#METABOOKPAGEBAR": {tap: pagebar_tap,
                              hold: pagebar_hold,
                              release: pagebar_release,
                              slip: pagebar_slip,
                              touchtoo: pagebar_touchtoo,
                              click: cancel},
         "#METABOOKPAGEREFTEXT": {tap: enterPageRef},
         "#METABOOKPAGENOTEXT": {tap: enterPageNum},
         "#METABOOKLOCPCT": {tap: enterPercentage},
         "#METABOOKLOCOFF": {tap: enterLocation},
         // Return to skimming
         "#METABOOKSKIMMER": {tap: skimmer_tapped},
         // Expanding/contracting the skimmer
         // Raise and lower HUD
         "#METABOOKPAGEHEAD": {touchstart: head_tap},
         "#METABOOKTABS": {touchstart: head_tap},
         "#METABOOKHEAD": {touchend: head_tap},
         "#METABOOKFOOT": {
             tap: foot_tap,touchstart: noDefault,touchmove: noDefault},
         "#METABOOKADDTAGINPUT": {keydown: addtag_keydown},
         "#METABOOKADDSHAREINPUT": {keydown: addoutlet_keydown},
         "#METABOOKATTACHFORM": {submit: attach_submit},
         "#METABOOKATTACHURL": {keydown: attach_keydown},
         "#METABOOKATTACHTITLE": {keydown: attach_keydown},
         "#METABOOKATTACHOK": {click: attach_action},
         "#METABOOKATTACHCANCEL": {click: attach_cancel},
         "#METABOOKGLOSSCLOUD": {
             tap: metaBook.UI.handlers.glosscloud_select,
             release: metaBook.UI.handlers.glosscloud_select},
         "#METABOOKSHARECLOUD": {
             tap: outlet_select,release: outlet_select},
         ".searchcloud": {
             tap: metaBook.UI.handlers.searchcloud_select,
             release: metaBook.UI.handlers.searchcloud_select},
         "#METABOOKNEXTPAGE": {touchstart: function(evt){
             metaBook.pageForward(evt); cancel(evt);}},
         "#METABOOKPREVPAGE": {touchstart: function(evt){
             metaBook.pageBackward(evt); cancel(evt);}},
         "#METABOOKNEXTSKIM": {touchstart: function(evt){
             metaBook.skimForward(evt); cancel(evt);}},
         "#METABOOKPREVSKIM": {touchstart: function(evt){
             metaBook.skimBackward(evt); cancel(evt);}},
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
         "#METABOOKADDGLOSS": {
             dragenter: addGlossDragOK,
             dragover: addGlossDragOK,
             drop: addGlossDrop},
         "#METABOOKGLOSSDETAIL": {
             touchend: metaBook.UI.dropHUD,click: cancel},
         ".hudmodebutton": {
             tap: hudmodebutton,hold: hudmodebutton,release: hudmodebutton,
             slip: hudmodebutton},
         ".hudbutton[alt='save gloss']": {
             tap: saveGloss,hold: saveGloss},
         // GLOSSFORM rules
         //".metabookglossform": {click: cancel,touchend: glossform_touch},
         "span.metabooksharegloss": {},
         ".metabookclosehud": {
             click: back_to_reading,
             touchmove: cancel,
             touchend: cancel},
         ".metabookglossform .response": {click: metaBook.toggleHUD},
         ".addglossmenu": {
             tap: glossmode_tap,
             hold: glossmode_hold,
             slip: glossmode_slip,
             release: glossmode_release,
             click: cancel},
         "div.glossetc": {
             touchstart: glossetc_touch,
             touchend: cancel},
         "div.glossetc div.sharing": {
             touchend: glossform_outlets_tapped,
             click: cancel},
         "div.glossetc div.notetext": {
             touchend: editglossnote,
             click: cancel},
         "#METABOOKSETTINGS": {
             touchend: fdjt.UI.CheckSpan.onclick},
         ".metabooktogglehelp": {
             touchstart: cancel,
             touchend: toggleHelp},
         
         "#METABOOKCONSOLETEXTINPUT": {
             touchstart: function(){
                 fdjt.ID('METABOOKCONSOLETEXTINPUT').focus();},
             focus: function(){
                 fdjt.DOM.addClass('METABOOKCONSOLEINPUT','ontop');},
             blur: function(){
                 fdjt.DOM.dropClass('METABOOKCONSOLEINPUT','ontop');}},

         "#METABOOKCONSOLEBUTTON": {
             touchstart: cancel, touchend: consolefn},
         "#METABOOKSAVESETTINGS": {
             touchstart: cancel, touchend: saveSettings},
         "#METABOOKAPPLYSETTINGS": {
             touchstart: cancel,
             touchend: updateSettings},
         // "#METABOOKWIPE": {touchstart: cancel, touchend: wipeBook},
         "#METABOOKRESETSETTINGS": {
             touchstart: cancel,
             touchend: resetSettings},
         "#METABOOKSETTINGSTABLE": {},
         "#METABOOKREFRESHOFFLINE": {
             touchstart: cancel, touchend: refreshOffline},
         "#METABOOKREFRESHLAYOUT": {
             touchstart: cancel, touchend: refreshLayout},
         "#METABOOKRESETSYNC": {touchstart: cancel, touchend: resetState},
         ".clearoffline": {touchstart: cancel, touchend: clearOffline},
         ".metabookclearmode": {touchstart: cancel, touchend: clearMode},
         "#METABOOKGOTOREFHELP": {touchstart: cancel, touchend: clearMode},
         "#METABOOKGOTOPAGEHELP": {touchstart: cancel, touchend: clearMode},
         "#METABOOKGOTOLOCHELP": {touchstart: cancel, touchend: clearMode},
         ".metabookshowsearch": {
             touchstart: cancel,
             touchend: function(evt){
                 metaBook.showSearchResults(); fdjt.UI.cancel(evt);}},
         ".metabookrefinesearch": {
             touchstart: cancel,
             touchend: function(evt){
                 metaBook.setMode('refinesearch'); fdjt.UI.cancel(evt);}},
         ".metabookexpandsearch": {
             touchstart: cancel,
             touchend: function(evt){
                 metaBook.setMode('expandsearch'); fdjt.UI.cancel(evt);}},
         ".metabookclearsearch": {
             touchstart: cancel,
             touchend: function(evt){
                 evt=evt||window.event;
                 metaBook.UI.handlers.clearSearch(evt);
                 fdjt.UI.cancel(evt);
                 return false;}},
         "#METABOOKSOURCES .button.everyone": {
             touchstart: cancel,
             touchend: function(evt){
                 evt=evt||window.event;
                 metaBook.UI.handlers.everyone_ontap(evt);
                 fdjt.UI.cancel(event);}}});
    
})();

/* Emacs local variables
   ;;;  Local variables: ***
   ;;;  compile-command: "cd ..; make" ***
   ;;;  indent-tabs-mode: nil ***
   ;;;  End: ***
*/

