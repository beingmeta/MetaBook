/* -*- Mode: Javascript; Character-encoding: utf-8; -*- */

/* ###################### metabook/hud.js ###################### */

/* Copyright (C) 2009-2015 beingmeta, inc.

   This file provides initialization and some interaction for the
   metaBook HUD (Heads Up Display), an layer on the book content
   provided by the metaBook e-reader web application.

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

metaBook.setMode=
    (function(){
        "use strict";
        var fdjtString=fdjt.String;
        var fdjtTime=fdjt.Time;
        var fdjtState=fdjt.State;
        var fdjtLog=fdjt.Log;
        var fdjtDOM=fdjt.DOM;
        var fdjtUI=fdjt.UI;
        var fdjtID=fdjt.ID;
        var TapHold=fdjtUI.TapHold;
        var mbID=metaBook.ID;
        
        var mB=metaBook;
        var Trace=mB.Trace;

        var MetaBookTOC=mB.TOCSlice;

        var IScroll=window.IScroll;

        // Helpful dimensions
        // Whether to call displaySync on mode changes
        var display_sync=false;
        
        var addClass=fdjtDOM.addClass;
        var dropClass=fdjtDOM.dropClass;
        var hasClass=fdjtDOM.hasClass;
        var getParent=fdjtDOM.getParent;
        var hasParent=fdjtDOM.hasParent;
        var hasSuffix=fdjtString.hasSuffix;

        var fixStaticRefs=metaBook.fixStaticRefs;

        var metaBookHUD=false;

        // This will contain the interactive input console (for debugging)
        var frame=false, hud=false;
        var allglosses=false;

        function initHUD(){
            if (fdjtID("METABOOKHUD")) return;
            var started=fdjtTime();
            var messages=fdjtDOM("div#METABOOKSTARTUPMESSAGES.startupmessages");
            messages.innerHTML=fixStaticRefs(metaBook.HTML.messages);
            if (Trace.startup>2) fdjtLog("Initializing HUD layout");
            metaBook.HUD=metaBookHUD=hud=
                fdjtDOM("div#METABOOKHUD.metabookhud");
            hud.innerHTML=fixStaticRefs(metaBook.HTML.hud);
            hud.metabookui=true;
            fdjtDOM.append(messages);
            if (fdjtID("METABOOKFRAME")) frame=fdjtID("METABOOKFRAME");
            else {
                frame=fdjtDOM("div#METABOOKFRAME");
                fdjtDOM.prepend(document.body,frame);}
            addClass(frame,"metabookframe");
            frame.appendChild(messages); frame.appendChild(hud);
            if (metaBook.getConfig("uisize"))
                addClass(frame,"metabookuifont"+metaBook.getConfig("uisize"));
            metaBook.Frame=frame;
            // Fill in the HUD help
            var hudhelp=fdjtID("METABOOKHUDHELP");
            hudhelp.innerHTML=fixStaticRefs(metaBook.HTML.hudhelp);
            // Fill in the HUD help
            var helptext=fdjtID("METABOOKAPPHELP");
            helptext.innerHTML=fixStaticRefs(metaBook.HTML.help);
            // Setup heart
            var heart=fdjtID("METABOOKHEARTBODY");
            heart.innerHTML=fixStaticRefs(metaBook.HTML.heart);
            metaBook.DOM.heart=heart;
            var gloss_attach=fdjtID("METABOOKGLOSSATTACH");
            gloss_attach.innerHTML=fixStaticRefs(metaBook.HTML.attach);
            metaBook.DOM.heart=heart;
            // Other HUD parts
            metaBook.DOM.top=fdjtID("METABOOKHEAD");
            metaBook.DOM.heart=fdjtID("METABOOKHEARTBODY");
            metaBook.DOM.head=fdjtID("METABOOKTOPBAR");
            metaBook.DOM.foot=fdjtID("METABOOKFOOT");
            metaBook.DOM.tabs=fdjtID("METABOOKTABS");

            metaBook.DOM.noteshud=fdjtID("METABOOKNOTETEXT");
            metaBook.DOM.asidehud=fdjtID("METABOOKASIDE");

            // Initialize the pagebar
            metaBook.DOM.pagebar=fdjtID("METABOOKPAGEBAR");
            
            // Initialize search UI
            var search=fdjtID("METABOOKSEARCH");
            search.innerHTML=fixStaticRefs(metaBook.HTML.searchbox);
            addClass(metaBook.HUD,"emptysearch");

            // Setup addgloss prototype
            var addgloss=fdjtID("METABOOKADDGLOSSPROTOTYPE");
            addgloss.innerHTML=fixStaticRefs(metaBook.HTML.addgloss);

            metaBook.UI.addHandlers(hud,"hud");

            if (Trace.startup>1)
                fdjtLog("Created basic HUD in %dms",fdjtTime()-started);

            if (!(metaBook.svg)) {
                var images=fdjtDOM.getChildren(hud,"img");
                var i=0; var lim=images.length;
                if (Trace.startup) fdjtLog("Switching images to SVG");
                while (i<lim) {
                    var img=images[i++];
                    if ((img.src)&&
                        ((hasSuffix(img.src,".svg"))||
                         (hasSuffix(img.src,".svgz")))&&
                        (img.getAttribute('bmp')))
                        img.src=img.getAttribute('bmp');}}

            metaBook.hudtick=fdjtTime();

            fdjtDOM.setInputs(".metabookrefuri",metaBook.refuri);
            fdjtDOM.setInputs(".metabookdocuri",metaBook.docuri);
            fdjtDOM.setInputs(".metabooktopuri",metaBook.topuri);
            
            // Initialize gloss UI
            metaBook.DOM.allglosses=fdjtID("METABOOKALLGLOSSES");
            if ((Trace.startup>2)&&(metaBook.DOM.allglosses))
                fdjtLog("Setting up gloss UI %o",allglosses);

            metaBook.allglosses=allglosses=
                new metaBook.Slice(metaBook.DOM.allglosses);
            metaBook.pagers.allglosses=metaBook.allglosses.pager;
            metaBook.glossdb.onAdd("maker",function(f,p,v){
                metaBook.sourcedb.ref(v).oninit
                (metaBook.UI.addGlossSource,"newsource");});
            metaBook.glossdb.onAdd("sources",function(f,p,v){
                metaBook.sourcedb.ref(v).oninit
                (metaBook.UI.addGlossSource,"newsource");});
            metaBook.glossdb.onLoad(addGloss2UI);
            
            function messageHandler(evt){
                var origin=evt.origin;
                if (Trace.messages)
                    fdjtLog("Got a message from %s with payload %o",
                            origin,evt.data);
                if (origin.search(/https:\/\/[^\/]+.sbooks.net/)!==0) {
                    fdjtLog.warn("Rejecting insecure message from %s",
                                 origin);
                    return;}
                if (evt.data==="sbooksapp") {
                    setMode("sbooksapp");}
                else if (evt.data==="loggedin") {
                    if (!(metaBook.user)) {
                        metaBook.userSetup();}}
                else if ((typeof evt.data === "string")&&
                         (evt.data.search("setuser=")===0)) {
                    if (!(metaBook.user)) {
                        metaBook.userinfo=JSON.parse(evt.data.slice(8));
                        metaBook.loginUser(metaBook.userinfo);
                        metaBook.setMode("welcome");
                        metaBook.userSetup();}}
                else if (evt.data.updateglosses) {
                    metaBook.updateInfo();}
                else if (evt.data.addlayer) {
                    metaBook.updateInfo();}
                else if ((evt.data.droplayer)||(evt.data.hidelayer)||
                         (evt.data.showlayer)) {
                    metaBook.refreshOffline();}
                else if (evt.data.userinfo) {
                    if (!(metaBook.user)) {
                        metaBook.userinfo=evt.data.userinfo;
                        metaBook.loginUser(metaBook.userinfo);
                        metaBook.setMode("welcome");
                        metaBook.userSetup();}}
                else if (evt.data)
                    fdjtDOM("METABOOKINTRO",evt.data);
                else {}}
            if (Trace.messages)
                fdjtLog("Setting up message listener");
            fdjtDOM.addListener(window,"message",messageHandler);
            
            metaBook.TapHold.foot=
                new fdjtUI.TapHold(
                    metaBook.DOM.foot,
                    {override: true,holdfast: true,taptapthresh: 0,
                     holdthresh: 500});
            metaBook.TapHold.head=
                new TapHold(metaBook.DOM.head,
                            {override: true,taptapthresh: 0,
                             holdthresh: 1000});
            metaBook.DOM.skimmer=fdjtID("METABOOKSKIMMER");
            metaBook.TapHold.skimmer=
                new TapHold(metaBook.DOM.skimmer,{taptapthresh: 800});
            
            var help=metaBook.DOM.help=fdjtID("METABOOKHELP");
            help.innerHTML=fixStaticRefs(metaBook.HTML.help);

            metaBook.scrollers={};

            /* Setup clouds */
            var dom_gloss_cloud=fdjtID("METABOOKGLOSSCLOUD");
            metaBook.gloss_cloud=
                new fdjtUI.Completions(
                    dom_gloss_cloud,fdjtID("METABOOKADDTAGINPUT"),
                    fdjtUI.FDJT_COMPLETE_OPTIONS|
                        fdjtUI.FDJT_COMPLETE_CLOUD|
                        fdjtUI.FDJT_COMPLETE_ANYWORD);
            updateScroller("METABOOKGLOSSCLOUD");
            metaBook.TapHold.gloss_cloud=new TapHold(metaBook.gloss_cloud.dom);

            metaBook.empty_cloud=
                new fdjtUI.Completions(
                    fdjtID("METABOOKALLTAGS"),false,
                    fdjtUI.FDJT_COMPLETE_OPTIONS|
                        fdjtUI.FDJT_COMPLETE_CLOUD|
                        fdjtUI.FDJT_COMPLETE_ANYWORD);
            if (metaBook.adjustCloudFont)
                metaBook.empty_cloud.updated=function(){
                    metaBook.adjustCloudFont(this);};
            metaBook.DOM.empty_cloud=fdjtID("METABOOKALLTAGS");
            updateScroller("METABOOKALLTAGS");
            metaBook.TapHold.empty_cloud=new TapHold(metaBook.empty_cloud.dom);
            
            var dom_share_cloud=fdjtID("METABOOKSHARECLOUD");
            metaBook.share_cloud=
                new fdjtUI.Completions(
                    dom_share_cloud,fdjtID("METABOOKADDSHAREINPUT"),
                    fdjtUI.FDJT_COMPLETE_OPTIONS|
                        fdjtUI.FDJT_COMPLETE_CLOUD|
                        fdjtUI.FDJT_COMPLETE_ANYWORD);
            metaBook.DOM.share_cloud=dom_share_cloud;
            updateScroller("METABOOKSHARECLOUD");
            metaBook.TapHold.share_cloud=new TapHold(metaBook.share_cloud.dom);

            fdjtDOM.setupCustomInputs(fdjtID("METABOOKHUD"));

            if (Trace.startup>1)
                fdjtLog("Initialized basic HUD in %dms",fdjtTime()-started);}
        metaBook.initHUD=initHUD;
        
        function resizeHUD(){
            var heart=fdjt.ID("METABOOKHEART"), hbody=fdjtID("METABOOKHEARTBODY");
            var geom=fdjtDOM.getGeometry(heart,false,true);
            hbody.style.maxWidth=geom.inner_width+"px";
            hbody.style.maxHeight=(geom.inner_height-100)+"px";
            fdjt.DOM.adjustFonts(metaBook.HUD);}
        metaBook.resizeHUD=resizeHUD;

        /* Various UI methods */
        function addGloss2UI(item){
            if (!(item.frag)) {
                fdjtLog.warn(
                    "Warning: skipping gloss %o with no fragment identifier",
                    item.uuid);}
            else if (mbID(item.frag)) {
                var addGlossmark=metaBook.UI.addGlossmark;
                // Assume it belongs to the user if it doesn't say
                if ((!(item.maker))&&(metaBook.user))
                    item.maker=(metaBook.user);
                allglosses.addCards(item);
                var nodes=metaBook.getDups(item.frag);
                addClass(nodes,"glossed");
                var i=0, lim=nodes.length; while (i<lim) {
                    addGlossmark(nodes[i++],item);}
                if (item.excerpt) {
                    var range=metaBook.findExcerpt(
                        nodes,item.excerpt,item.exoff);
                    if (range) {
                        fdjtUI.Highlight(
                            range,"mbexcerpt",
                            item.note,{"data-glossid":item._id});}}
                if (item.tags) {
                    var gloss_cloud=metaBook.gloss_cloud;
                    var tags=item.tags, j=0, n_tags=tags.length;
                    while (j<n_tags)
                        metaBook.cloudEntry(tags[j++],gloss_cloud);}
                if (item.tstamp>metaBook.syncstamp)
                    metaBook.syncstamp=item.tstamp;
                if (metaBook.pagers.METABOOKALLGLOSSES)
                    metaBook.pagers.METABOOKALLGLOSSES.changed();}
            else {
                fdjtLog("Gloss refers to nonexistent '%s': %o",item.frag,item);
                return;}}
        metaBook.addGloss2UI=addGloss2UI;

        /* Creating the HUD */
        
        function setupTOC(root_info){
            var panel=fdjtDOM("div#METABOOKSTATICTOC.metabookslice.mbtocslice.hudpanel");
            fdjtDOM.replace("METABOOKSTATICTOC",panel);
            var tocslice=new MetaBookTOC(root_info,panel);
            tocslice.update();
            metaBook.tocslice=tocslice;
            metaBook.statictoc=tocslice;
            metaBook.pagers.statictoc=tocslice.pager;
            metaBook.setupGestures(panel);
            return tocslice;}
        metaBook.setupTOC=setupTOC;

        /* HUD animation */

        function setHUD(flag,clearmode){
            if (typeof clearmode === 'undefined') clearmode=true;
            if ((Trace.gestures)||(Trace.mode))
                fdjtLog("setHUD %o mode=%o hudup=%o bc=%o hc=%o",
                        flag,metaBook.mode,metaBook.hudup,
                        document.body.className,
                        metaBookHUD.className);
            if (flag) {
                metaBook.hudup=true;
                dropClass(document.body,"mbSKIMMING");
                addClass(document.body,"hudup");}
            else {
                metaBook.hudup=false;
                metaBook.scrolling=false;
                if (metaBook.previewing)
                    metaBook.stopPreview("setHUD");
                dropClass(document.body,"mbSHRINK");
                if (clearmode) {
                    if (metaBook.popmode) {
                        var fn=metaBook.popmode;
                        metaBook.popmode=false;
                        fn();}
                    dropClass(metaBookHUD,"openheart");
                    dropClass(metaBookHUD,"openhead");
                    dropClass(metaBookHUD,"full");
                    dropClass(metaBookHUD,metaBookModes);
                    dropClass(document.body,"mbSKIMMING");
                    dropClass(document.body,"mbSKIMSTART");
                    dropClass(document.body,"mbSKIMEND");
                    metaBook.mode=false;}
                dropClass(document.body,"hudup");
                dropClass(document.body,"openhud");
                metaBook.focusBody();}}
        metaBook.setHUD=setHUD;

        /* Opening and closing the cover */

        function showCover(){
            if (metaBook._setup)
                fdjtState.dropLocal("metabook.opened("+metaBook.docuri+")");
            setHUD(false);
            metaBook.closed=true;
            if (metaBook.covermode) {
                addClass(metaBook.cover,metaBook.covermode);
                metaBook.mode=metaBook.covermode;}
            addClass(document.body,"mbCOVER");}
        metaBook.showCover=showCover;
        function hideCover(){
            if (metaBook._setup)
                fdjtState.setLocal(
                    "metabook.opened("+metaBook.docuri+")",fdjtTime());
            metaBook.closed=false;
            dropClass(document.body,"mbCOVER");
            if (metaBook.mode) {
                metaBook.covermode=metaBook.mode;
                metaBook.mode=false;
                metaBook.cover.className="";}}
        metaBook.hideCover=hideCover;
        function toggleCover(){
            if (hasClass(document.body,"mbCOVER")) hideCover();
            else showCover();}
        metaBook.toggleCover=toggleCover;
        
        /* Mode controls */
        
        var metaBookModes=/\b((search)|(refinesearch)|(expandsearch)|(searchresults)|(overtoc)|(openglossmark)|(allglosses)|(context)|(statictoc)|(minimal)|(addgloss)|(gotoloc)|(gotoref)|(gotopage)|(shownote)|(showaside)|(glossdetail))\b/g;
        var metabookHeartModes=/\b((statictoc)|(search)|(refinesearch)|(expandsearch)|(searchresults)|(allglosses)|(showaside)|(glossaddtag)|(glossaddtag)|(glossaddoutlet)|(glossdetail))\b/g;
        var metabookHeadModes=/\b((overtoc)|(search)|(refinesearch)|(expandsearch)|(searchresults)|(allglosses)|(addgloss)|(shownote))\b/g;
        var metaBookPopModes=/\b((glossdetail))\b/g;
        var metaBookCoverModes=/\b((welcome)|(help)|(layers)|(login)|(settings)|(cover)|(aboutsbooks)|(console)|(aboutbook)|(titlepage))\b/g;
        var metaBookSearchModes=/((refinesearch)|(searchresults)|(expandsearch))/;
        metaBook.searchModes=metaBookSearchModes;
        var metabook_mode_scrollers=
            {allglosses: "METABOOKALLGLOSSES",
             searchresults: "METABOOKSEARCHRESULTS",
             expandsearch: "METABOOKALLTAGS",
             search: "METABOOKSEARCHCLOUD",
             refinesearch: "METABOOKSEARCHCLOUD",
             openglossmark: "METABOOKPOINTGLOSSES",
             statictoc: "METABOOKSTATICTOC"};
        var metabook_mode_foci=
            {gotopage: "METABOOKPAGEINPUT",
             gotoloc: "METABOOKLOCINPUT",
             gotoref: "METABOOKREFINPUT",
             search: "METABOOKSEARCHINPUT",
             refinesearch: "METABOOKSEARCHINPUT",
             expandsearch: "METABOOKSEARCHINPUT"};
        
        function setMode(mode,nohud){
            var oldmode=metaBook.mode, mode_focus, mode_input;
            if (typeof mode === 'undefined') return oldmode;
            if (mode==='last') mode=metaBook.last_mode;
            if ((!(mode))&&(metaBook.mode)&&
                (metaBook.mode.search(metaBookPopModes)>=0))
                mode=metaBook.last_mode;
            if (mode==='none') mode=false;
            if (mode==='heart') mode=metaBook.heart_mode||"statictoc";
            if (Trace.mode)
                fdjtLog("setMode %o, cur=%o dbc=%o",
                        mode,metaBook.mode,document.body.className);
            if ((mode!==metaBook.mode)&&(metaBook.previewing))
                metaBook.stopPreview("setMode");
            if ((mode!==metaBook.mode)&&(metaBook.popmode)) {
                var fn=metaBook.popmode;
                metaBook.popmode=false;
                fn();}
            if ((mode==="layers")&&
                (!(fdjtID("SBOOKSAPP").src))&&
                (!(metaBook.appinit)))
                metaBook.initIFrameApp();
            if ((metaBook.mode==="addgloss")&&(mode!=="addgloss")&&
                (hasClass("METABOOKLIVEGLOSS","modified")))
                metaBook.submitGloss(fdjt.ID("METABOOKLIVEGLOSS"));
            if (mode) {
                if (mode==="search") mode=metaBook.search_mode||"refinesearch";
                if (mode==="addgloss") {}
                else dropClass(document.body,"mbSHRINK");
                if (mode===true) {
                    /* True just puts up the HUD with no mode info */
                    metaBook.hideCover();
                    if (metabook_mode_foci[metaBook.mode]) {
                        mode_focus=metabook_mode_foci[metaBook.mode];
                        mode_input=
                            (((mode_focus.search(/[.#]/))>=0)?
                             (fdjtDOM.$1(mode_focus)):(fdjtID(mode_focus)));
                        mode_input.blur();}
                    dropClass(metaBookHUD,metaBookModes);
                    metaBook.mode=false;
                    metaBook.last_mode=true;}
                else if (typeof mode !== 'string') 
                    throw new Error('mode arg not a string');
                else if (mode.search(metaBookCoverModes)>=0) {
                    if (mode!==metaBook.mode) {
                        fdjtID("METABOOKCOVER").className=mode;
                        metaBook.mode=mode;
                        metaBook.modechange=fdjtTime();}
                    if (mode==="console") fdjtLog.update();
                    showCover();
                    return;}
                else if (mode===metaBook.mode) {}
                else {
                    metaBook.hideCover();
                    metaBook.modechange=fdjtTime();
                    if (metabook_mode_foci[metaBook.mode]) {
                        mode_focus=metabook_mode_foci[metaBook.mode];
                        mode_input=
                            (((mode_focus.search(/[.#]/))>=0)?
                             (fdjtDOM.$1(mode_focus)):(fdjtID(mode_focus)));
                        mode_input.blur();}
                    if (mode!==metaBook.mode) metaBook.last_mode=metaBook.mode;
                    metaBook.mode=mode;}
                // If we're switching to the inner app but the iframe
                //  hasn't been initialized, we do it now.
                if ((mode==="sbooksapp")&&
                    (!(fdjtID("SBOOKSAPP").src))&&
                    (!(metaBook.appinit)))
                    initIFrameApp();
                // Update metaBook.scrolling which is the scrolling
                // element in the HUD for this mode
                if (typeof mode !== 'string')
                    metaBook.scrolling=false;
                else if (metabook_mode_scrollers[mode]) 
                    metaBook.scrolling=(metabook_mode_scrollers[mode]);
                else metaBook.scrolling=false;

                if ((mode==='refinesearch')||
                    (mode==='searchresults')||
                    (mode==='expandsearch'))
                    metaBook.search_mode=mode;

                if ((mode==='addgloss')||(mode==="openglossmark")) 
                    addClass(document.body,"openhud");
                else if (nohud) {}
                // And if we're not skimming, we just raise the hud
                else setHUD(true);
                // Actually change the class on the HUD object
                if (mode===true) {
                    dropClass(metaBookHUD,"openhead");
                    dropClass(metaBookHUD,"openheart");
                    fdjtDOM.swapClass(metaBookHUD,metaBookModes,"minimal");}
                else if (mode==="addgloss") {
                    // addgloss has submodes which may specify the
                    //  open heart configuration
                    addClass(metaBookHUD,"openhead");
                    dropClass(metaBookHUD,"openheart");}
                else {
                    if (mode.search(metabookHeartModes)<0) {
                        dropClass(metaBookHUD,"openheart");}
                    if (mode.search(metabookHeadModes)<0)
                        dropClass(metaBookHUD,"openhead");
                    if (mode.search(metabookHeartModes)>=0) {
                        metaBook.heart_mode=mode;
                        addClass(metaBookHUD,"openheart");}
                    if (mode.search(metabookHeadModes)>=0) {
                        metaBook.head_mode=mode;
                        addClass(metaBookHUD,"openhead");}}
                changeMode(mode);}
            else {
                // Clearing the mode is a lot simpler, in part because
                //  setHUD clears most of the classes when it brings
                //  the HUD down.
                metaBook.last_mode=metaBook.mode;
                if (hasClass(document.body,"mbCOVER")) hideCover();
                if ((metaBook.mode==="openglossmark")&&
                    (fdjtID("METABOOKOPENGLOSSMARK")))
                    fdjtID("METABOOKOPENGLOSSMARK").id="";
                if (metaBook.textinput) {
                    metaBook.setFocus(false);}
                metaBook.focusBody();
                if (metaBook.skimpoint) {
                    var dups=metaBook.getDups(metaBook.target);
                    metaBook.clearHighlights(dups);
                    dropClass(dups,"mbhighlightpassage");}
                dropClass(metaBookHUD,"openheart");
                dropClass(metaBookHUD,"openhead");
                dropClass(document.body,"dimmed");
                dropClass(document.body,"mbSHOWHELP");
                dropClass(document.body,"mbPREVIEW");
                dropClass(document.body,"mbSHRINK");
                dropClass(metaBookHUD,metaBookModes);
                metaBook.cxthelp=false;
                if (display_sync) metaBook.displaySync();
                if (nohud) metaBook.setHUD(false);
                else setHUD(false);}}
        
        function changeMode(mode){      
            if (Trace.mode)
                fdjtLog("changeMode %o, cur=%o dbc=%o",
                        mode,metaBook.mode,document.body.className);
            fdjtDOM.dropClass(metaBookHUD,metaBookModes);
            fdjtDOM.addClass(metaBookHUD,mode);
            if (mode==="statictoc") {
                var headinfo=((metaBook.head)&&(metaBook.head.id)&&
                              (metaBook.docinfo[metaBook.head.id]));
                var hhinfo=headinfo.head, pinfo=headinfo.prev;
                var static_head=fdjt.ID("METABOOKSTATICTOC4"+headinfo.frag);
                var static_hhead=
                    ((hhinfo)&&(fdjt.ID("METABOOKSTATICTOC4"+hhinfo.frag)));
                var static_phead=
                    ((pinfo)&&(fdjt.ID("METABOOKSTATICTOC4"+pinfo.frag)));
                if ((static_head)&&(static_head.scrollIntoView)) {
                    if (static_hhead) static_hhead.scrollIntoView();
                    if ((static_phead)&&(static_phead.scrollIntoViewIfNeeded))
                        static_phead.scrollIntoViewIfNeeded();
                    if (static_head.scrollIntoViewIfNeeded)
                        static_head.scrollIntoViewIfNeeded();
                    else static_head.scrollIntoView();}}
            else if (mode==="allglosses") {
                var curloc=metaBook.location;
                var allcards=metaBook.DOM.allglosses.childNodes;
                var i=0, lim=allcards.length;
                var card=false, lastcard=false, lasthead=false;
                if (metaBook.allglosses) metaBook.allglosses.setLive(true);
                while (i<lim) {
                    var each=allcards[i++];
                    if (each.nodeType!==1) continue;
                    lastcard=card; card=each;
                    if (hasClass(card,"newhead")) lasthead=card;
                    var loc=card.getAttribute("data-location");
                    if (loc) loc=parseInt(loc,10);
                    if (loc>=curloc) break;}
                if (i>=lim) card=lastcard=false;
                if (metaBook.pagers.allglosses)
                    (metaBook.pagers.allglosses).setPage(card);}
            else {}
            
            // This updates scroller dimensions, we delay it
            //  because apparently, on some browsers, the DOM
            //  needs to catch up with CSS
            if ((metaBook.scrolling)&&(metaBook.iscroll)) {
                var scroller=fdjtID(metaBook.scrolling);
                if (Trace.iscroll)
                    fdjtLog("Updating scroller for #%s s=%o",
                            metaBook.scrolling,scroller);
                setTimeout(function(){updateScroller(scroller);},
                           2000);}
            
            // We autofocus any input element appropriate to the
            // mode
            if (metabook_mode_foci[mode]) {
                var mode_focus=metabook_mode_foci[metaBook.mode];
                var mode_input=
                    (((mode_focus.search(/[.#]/))>=0)?
                     (fdjtDOM.$1(mode_focus)):(fdjtID(mode_focus)));
                if ((mode_input)&&
                    ((!(metaBook.touch))||
                     (hasParent(mode_input,metaBook.DOM.foot)))) {
                    setTimeout(function(){
                        metaBook.setFocus(mode_input);},
                               50);}}
            else if ((mode==="addgloss")&&(metaBook.glossform)) {
                var glossform=metaBook.glossform;
                var curglossmode=metaBook.getGlossMode(glossform);
                metaBook.setGlossMode(curglossmode,glossform);}
            // Moving the focus back to the body lets keys work
            else setTimeout(metaBook.focusBody,50);
            
            if (display_sync) metaBook.displaySync();}

        function updateScroller(elt){
            /* jshint newcap: false */
            if (!(metaBook.iscroll)) return;
            if ((elt)&&(Trace.scrolling))
                fdjtLog("Updating scroller for %o",elt);
            if (metaBook.heartscroller) metaBook.heartscroller.refresh();
            else {
                var heart=fdjtID("METABOOKHEARTBODY");
                var contents=fdjtID("METABOOKHEARTCONTENT");
                if (!(contents)) {
                    contents=fdjtDOM("div#METABOOKHEARTCONTENT");
                    fdjtDOM(contents,fdjtDOM.Array(heart.childNodes));
                    fdjtDOM(heart,contents);}
                metaBook.heartscroller=new IScroll(heart);
                metaBook.heartscroller.refresh();}}
        metaBook.UI.updateScroller=updateScroller;

        function metaBookHUDToggle(mode,keephud){
            if (!(metaBook.mode)) setMode(mode);
            else if (mode===metaBook.mode)
                if (keephud) setMode(true); else setMode(false);
            else if ((mode==='heart')&&
                     (metaBook.mode.search(metabookHeartModes)===0))
                if (keephud) setMode(true); else setMode(false);
            else setMode(mode);}
        metaBook.toggleMode=metaBookHUDToggle;

        metaBook.dropHUD=function(){return setMode(false);};
        metaBook.toggleHUD=function(evt){
            evt=evt||window.event;
            if ((evt)&&(fdjtUI.isClickable(fdjtUI.T(evt)))) return;
            fdjtLog("toggle HUD %o hudup=%o",evt,metaBook.hudup);
            if (metaBook.hudup) setHUD(false,false);
            else setHUD(true);};
        
        /* The App HUD */

        var iframe_app_init=false;
        function initIFrameApp(){
            if (iframe_app_init) return;
            if (metaBook.appinit) return;
            var query="";
            if (document.location.search) {
                if (document.location.search[0]==="?")
                    query=query+document.location.search.slice(1);
                else query=query+document.location.search;}
            if ((query.length)&&(query[query.length-1]!=="&"))
                query=query+"&";
            var refuri=metaBook.refuri;
            var appuri="https://"+metaBook.server+"/flyleaf?"+query;
            if (query.search("REFURI=")<0)
                appuri=appuri+"REFURI="+encodeURIComponent(refuri);
            if (query.search("TOPURI=")<0)
                appuri=appuri+"&TOPURI="+
                encodeURIComponent(document.location.href);
            if (document.title) {
                appuri=appuri+"&DOCTITLE="+encodeURIComponent(document.title);}
            if (metaBook.user) {
                appuri=appuri+"&BOOKUSER="+encodeURIComponent(metaBook.user._id);}
            if (document.location.hash) {
                appuri=appuri+"&HASH="+document.location.hash.slice(1);}

            var app=fdjtID("SBOOKSAPP");
            app.src=appuri;
            iframe_app_init=true;}
        metaBook.initIFrameApp=initIFrameApp;

        metaBook.selectApp=function(){
            if (metaBook.mode==='sbooksapp') setMode(false);
            else setMode('sbooksapp');};

        /* Skimming */

        function stopSkimming(){
            // Tapping the tochead returns to results/glosses/etc
            var skimming=metaBook.skimpoint;
            if (!(skimming)) return;
            dropClass(document.body,"mbSKIMMING");
            if (getParent(skimming,fdjtID("METABOOKALLGLOSSES"))) 
                metaBook.setMode("allglosses");
            else if (getParent(skimming,fdjtID("METABOOKSTATICTOC"))) 
                metaBook.setMode("statictoc");
            else if (getParent(skimming,fdjtID("METABOOKSEARCHRESULTS"))) 
                metaBook.setMode("searchresults");
            else {}}
        metaBook.stopSkimming=stopSkimming;
        
        function metaBookSkimTo(card,dir,expanded){
            var skimpoint=metaBook.skimpoint;
            var slice=metaBook[metaBook.mode];
            var cardinfo=slice.getInfo(card);
            var passage=fdjt.ID(cardinfo.id);
            var i=0, lim=0;
            if (typeof dir !== "number") dir=0;
            addClass(document.body,"mbSKIMMING"); setHUD(false,false);
            if (Trace.mode)
                fdjtLog("metaBookSkim() %o (card=%o) mode=%o scn=%o/%o dir=%o",
                        passage,card,
                        metaBook.mode,metaBook.skimpoint,
                        metaBook.target,
                        dir);
            // Copy the description of what we're skimming into the
            // skimmer (at the top of the page during skimming and
            // preview)
            if (skimpoint!==card) {
                var skimmer=fdjtID("METABOOKSKIMMER");
                var clone=card.cloneNode(true);
                var pct=((dir<0)?("-120%"):(dir>0)?("120%"):(false));
                dropClass(skimmer,"transimate");
                fdjtDOM.replace("METABOOKSKIM",clone);
                var dropTransAnimate=function(){
                    dropClass(skimmer,"transanimate");
                    fdjtDOM.removeListener(
                        skimmer,"transitionend",dropTransAnimate);};
                if ((skimpoint)&&(pct)) {
                    skimmer.style[fdjtDOM.transform]=
                        "translate("+pct+",0)";
                    setTimeout(function(){
                        addClass(skimmer,"transanimate");
                        fdjtDOM.addListener(
                            skimmer,"transitionend",dropTransAnimate);
                        setTimeout(function(){
                            skimmer.style[fdjtDOM.transform]="";},
                                   0);},
                               0);}
                slice.setSkim(card);
                var skiminfo=fdjtID("METABOOKSKIMINFO");
                if (skiminfo)
                    skiminfo.innerHTML=
                    (slice.skimpos+1)+"/"+(slice.visible.length);
                // This marks where we are currently skimming
                if (skimpoint) dropClass(skimpoint,"skimpoint");
                if (card) addClass(card,"skimpoint");
                if (typeof expanded === "undefined") {}
                else if (expanded) addClass("METABOOKSKIMMER","expanded");
                else dropClass("METABOOKSKIMMER","expanded");
                metaBook.skimpoint=card;}
            else {}
            // This all makes sure that the >| and |< buttons
            // appear appropriately
            if (slice.atEnd)
                addClass(document.body,"mbSKIMEND");
            else dropClass(document.body,"mbSKIMEND");
            if (slice.atStart)
                addClass(document.body,"mbSKIMSTART");
            else dropClass(document.body,"mbSKIMSTART");
            var highlights=[];
            if (metaBook.target)
                metaBook.clearHighlights(metaBook.getDups(metaBook.target));
            dropClass("METABOOKSKIMMER","mbfoundhighlights");
            metaBook.setTarget(passage);
            if ((card)&&(hasClass(card,"gloss"))) {
                var glossinfo=metaBook.glossdb.ref(card.name);
                if (glossinfo.excerpt) {
                    var searching=metaBook.getDups(passage.id);
                    var range=metaBook.findExcerpt(
                        searching,glossinfo.excerpt,glossinfo.exoff);
                    if (range) {
                        highlights=
                            fdjtUI.Highlight(range,"mbhighlightexcerpt");
                        addClass("METABOOKSKIMMER","mbfoundhighlights");}}
                else if (card.about[0]==="#")
                    addClass(metaBook.getDups(card.about.slice(1)),
                             "mbhighlightpassage");
                else addClass(metaBook.getDups(card.about),"mbhighlightpassage");}
            else if ((card)&&(getParent(card,".sbookresults"))) {
                var about=card.about, target=mbID(about);
                if (target) {
                    var info=metaBook.docinfo[target.id];
                    var terms=metaBook.query.tags;
                    var spellings=info.knodeterms;
                    i=0; lim=terms.length;
                    if (lim===0)
                        addClass(metaBook.getDups(target),
                                 "mbhighlightpassage");
                    else while (i<lim) {
                        var term=terms[i++];
                        var h=metaBook.highlightTerm(
                            term,target,info,spellings);
                        highlights=highlights.concat(h);}}}
            metaBook.GoTo(passage,"Skim");}
        metaBook.SkimTo=metaBookSkimTo;

        metaBook.addConfig("uisize",function(name,value){
            fdjtDOM.swapClass(
                metaBook.Frame,/metabookuifont\w+/g,"metabookuifont"+value);
            fdjt.Async(function(){metaBook.resizeUI();});
            fdjt.Async(function(){
                metaBook.updateSettings(name,value);});});
        metaBook.addConfig("dyslexical",function(name,value){
            if ((value)&&(typeof value === 'string')&&(/yes|on|t/i.exec(value))) {
                if (hasClass(document.body,"_DYSLEXICAL")) return;
                else {
                    metaBook.dyslexical=true;
                    addClass(document.body,"_DYSLEXICAL");}}
            else if (!(hasClass(document.body,"_DYSLEXICAL")))
                return;
            else {
                metaBook.dyslexical=false;
                fdjtDOM.dropClass(document.body,"_DYSLEXICAL");}
            fdjt.Async(function(){
                metaBook.resizeUI();
                if (metaBook.layout) metaBook.Paginate("typechange");},
                       10);});
        metaBook.addConfig("animatecontent",function(name,value){
            if (metaBook.dontanimate) {}
            else if (value) addClass(document.body,"_ANIMATE");
            else dropClass(metaBook.page,"_ANIMATE");
            fdjt.Async(function(){
                metaBook.updateSettings(name,value);});});
        metaBook.addConfig("animatehud",function(name,value){
            if (metaBook.dontanimate) {}
            else if (value) addClass("METABOOKFRAME","_ANIMATE");
            else dropClass("METABOOKFRAME","_ANIMATE");
            fdjt.Async(function(){
                metaBook.updateSettings(name,value);});});

        /* Settings apply/save handlers */

        function keyboardHelp(arg,force){
            if (arg===true) {
                if (metaBook.keyboardHelp.timer) {
                    clearTimeout(metaBook.keyboardHelp.timer);
                    metaBook.keyboardHelp.timer=false;}
                dropClass("METABOOKKEYBOARDHELPBOX","closing");
                dropClass("METABOOKKEYBOARDHELPBOX","closed");
                return;}
            else if (arg===false) {
                if (metaBook.keyboardHelp.timer) {
                    clearTimeout(metaBook.keyboardHelp.timer);
                    metaBook.keyboardHelp.timer=false;}
                addClass("METABOOKKEYBOARDHELPBOX","closed");
                dropClass("METABOOKKEYBOARDHELPBOX","closing");
                return;}
            if ((!force)&&(!(metaBook.keyboardhelp))) return;
            if (typeof arg === 'string') arg=fdjtID(arg);
            if ((!(arg))||(!(arg.nodeType))) return;
            var box=fdjtID("METABOOKKEYBOARDHELPBOX");
            var content=arg.cloneNode(true);
            content.id="METABOOKKEYBOARDHELP";
            fdjtDOM.replace("METABOOKKEYBOARDHELP",content);
            fdjtDOM.dropClass(box,"closed");
            metaBook.keyboardHelp.timer=
                setTimeout(function(){
                    fdjtDOM.addClass(box,"closing");
                    metaBook.keyboardHelp.timer=
                        setTimeout(function(){
                            metaBook.keyboardHelp.timer=false;
                            fdjtDOM.swapClass(box,"closing","closed");},
                                   5000);},
                           5000);}
        metaBook.keyboardHelp=keyboardHelp;

        /* Showing a particular gloss */

        metaBook.showGloss=function showGloss(uuid){
            if (!(metaBook.glossdb.ref(uuid))) return false;
            var elts=document.getElementsByName(uuid);
            if (!(elts)) return false;
            else if (!(elts.length)) return false;
            else {
                var hasParent=fdjtDOM.hasParent;
                var i=0, lim=elts.length;
                while (i<lim) {
                    var src=elts[i++];
                    if (hasParent(src,allglosses)) {
                        setMode("allglosses");
                        metaBook.SkimTo(src);
                        return true;}}
                return false;}};

        /* Setting/clearing help mode */
        metaBook.hideHelp=function(){
            fdjtDOM.dropClass(document.body,"mbSHOWHELP");};
        metaBook.showHelp=function(){
            fdjtDOM.addClass(document.body,"mbSHOWHELP");};

        return setMode;})();

/* Emacs local variables
   ;;;  Local variables: ***
   ;;;  compile-command: "cd ..; make" ***
   ;;;  indent-tabs-mode: nil ***
   ;;;  End: ***
*/
