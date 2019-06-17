/* -*- Mode: Javascript; Character-encoding: utf-8; -*- */

/* ###################### metareader/hud.js ###################### */

/* Copyright (C) 2009-2017 beingmeta, inc.

   This file provides initialization and some interaction for the
   metaReader HUD (Heads Up Display), an layer on the book content
   provided by the metaReader e-reader web application.

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

/* Initialize these here, even though they should always be
   initialized before hand.  This will cause various code checkers to
   not generate unbound variable warnings when called on individual
   files. */
// var fdjt=((typeof fdjt !== "undefined")?(fdjt):({}));
// var metaReader=((typeof metaReader !== "undefined")?(metaReader):({}));
// var Knodule=((typeof Knodule !== "undefined")?(Knodule):({}));

metaReader.setMode=
    (function(){
        "use strict";
        var fdjtString=fdjt.String;
        var fdjtTime=fdjt.Time;
        var fdjtState=fdjt.State;
        var fdjtLog=fdjt.Log;
        var fdjtDOM=fdjt.DOM;
        var fdjtUI=fdjt.UI;
        var $ID=fdjt.ID;
        var TapHold=fdjtUI.TapHold;
        var mbID=metaReader.ID;
        
        var mR=metaReader;
        var Trace=mR.Trace;

        var MetaBookTOC=mR.TOCSlice;

        // Helpful dimensions
        // Whether to call displaySync on mode changes
        var display_sync=false;
        
        var addClass=fdjtDOM.addClass;
        var dropClass=fdjtDOM.dropClass;
        var hasClass=fdjtDOM.hasClass;
        var getParent=fdjtDOM.getParent;
        var hasParent=fdjtDOM.hasParent;
        var hasSuffix=fdjtString.hasSuffix;

        var fixStaticRefs=mR.fixStaticRefs;

        var metaReaderHUD=false;

        // This will contain the interactive input console (for debugging)
        var frame=false, hud=false;
        var allglosses=false;

        function initHUD(){
            if ($ID("METABOOKHUD")) return;
            var started=fdjtTime();
            var messages=fdjtDOM("div#METABOOKSTARTUPMESSAGES.startupmessages");
            messages.innerHTML=fixStaticRefs(metaReader.HTML.messages);
            if (Trace.startup>2) fdjtLog("Initializing HUD layout");
            metaReader.HUD=metaReaderHUD=hud=
                fdjtDOM("div#METABOOKHUD.metareaderhud");
            hud.innerHTML=fixStaticRefs(mR.HTML.hud);
            hud.metareaderui=true;
            fdjtDOM.append(messages);
            if ($ID("METABOOKFRAME")) frame=$ID("METABOOKFRAME");
            else {
                frame=fdjtDOM("div#METABOOKFRAME");
                if ((!(mR.dontanimate))&&(mR.getConfig("animatehud")))
                    addClass(frame,"_ANIMATE");
                fdjtDOM.prepend(document.body,frame);}
            addClass(frame,"metareaderframe");
            addClass(frame,"tapholdcontext");
            frame.appendChild(messages); frame.appendChild(hud);
            if (mR.getConfig("uisize"))
                addClass(frame,"metareaderuifont"+mR.getConfig("uisize"));
            metaReader.Frame=frame;
            // Fill in the HUD help
            var hudhelp=$ID("METABOOKHUDHELP");
            hudhelp.innerHTML=fixStaticRefs(mR.HTML.hudhelp);
            // Fill in the HUD help
            var helptext=$ID("METABOOKAPPHELP");
            helptext.innerHTML=fixStaticRefs(mR.HTML.help);
            // Setup heart
            var heart=$ID("METABOOKHEARTBODY");
            heart.innerHTML=fixStaticRefs(mR.HTML.heart);
            metaReader.DOM.heart=heart;
            var gloss_attach=$ID("METABOOKGLOSSATTACH");
            gloss_attach.innerHTML=fixStaticRefs(mR.HTML.attach);
            metaReader.DOM.heart=heart;
            // Other HUD parts
            metaReader.DOM.head=$ID("METABOOKHEAD");
            metaReader.DOM.heart=$ID("METABOOKHEARTBODY");
            metaReader.DOM.foot=$ID("METABOOKFOOT");
            metaReader.DOM.tabs=$ID("METABOOKTABS");

            metaReader.DOM.noteshud=$ID("METABOOKNOTETEXT");
            metaReader.DOM.asidehud=$ID("METABOOKASIDE");

            // Initialize the pagebar
            metaReader.DOM.pagebar=$ID("METABOOKPAGEBAR");
            
            // Initialize search UI
            var search=$ID("METABOOKSEARCH");
            search.innerHTML=fixStaticRefs(mR.HTML.searchbox);
            addClass(mR.HUD,"emptysearch");

            // Setup addgloss prototype
            var addgloss=$ID("METABOOKADDGLOSSPROTOTYPE");
            addgloss.innerHTML=fixStaticRefs(mR.HTML.addgloss);

            metaReader.UI.addHandlers(hud,"hud");

            if (Trace.startup>1)
                fdjtLog("Created basic HUD in %dms",fdjtTime()-started);

            if (!(mR.svg)) {
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

            metaReader.hudtick=fdjtTime();

            fdjtDOM.setInputs(".metareaderrefuri",mR.refuri);
            fdjtDOM.setInputs(".metareaderdocuri",mR.docuri);
            fdjtDOM.setInputs(".metareadertopuri",mR.topuri);
            
            // Initialize gloss UI
            metaReader.DOM.allglosses=$ID("METABOOKALLGLOSSES");
            if ((Trace.startup>2)&&(mR.DOM.allglosses))
                fdjtLog("Setting up gloss UI %o",allglosses);

            metaReader.slices.allglosses=allglosses=
                new mR.Slice(mR.DOM.allglosses);
            metaReader.slices.allglosses.mode="allglosses";
            metaReader.glossdb.onAdd("maker",function(f,p,v){
                mR.sourcedb.ref(v).oninit
                (mR.UI.addGlossSource,"newsource");});
            metaReader.glossdb.onAdd("sources",function(f,p,v){
                mR.sourcedb.ref(v).oninit
                (mR.UI.addGlossSource,"newsource");});
            metaReader.glossdb.onLoad(addGloss2UI);
            
            function messageHandler(evt){
                var origin=evt.origin;
                if (Trace.messages)
                    fdjtLog("Got a message from %s with payload %j",origin,evt.data);
                if (origin.search(/https:\/\/[^\/]+.(bookhub\.io|metareaders\.net)/)!==0) {
                    fdjtLog.warn("Rejecting insecure message from %s: %s",
                                 origin,evt.data);
                    return;}
                if (evt.data==="metareadersapp") {
                    setMode("bookhubapp");}
                else if (evt.data==="loggedin") {
                    if (!(mR.user)) {
                        mR.userSetup();}}
                else if ((typeof evt.data === "string")&&
                         (evt.data.search("setuser=")===0)) {
                    if (!(mR.user)) {
                        metaReader.userinfo=JSON.parse(evt.data.slice(8));
                        mR.loginUser(mR.userinfo);
                        if (mR.mode==='login') setMode("cover");
                        mR.userSetup();}}
                else if (evt.data.updateglosses) {
                    mR.updateInfo();}
                else if (evt.data.addlayer) {
                    mR.updateInfo();}
                else if ((evt.data.droplayer)||(evt.data.hidelayer)||
                         (evt.data.showlayer)) {
                    mR.refreshOffline();}
                else if (evt.data.userinfo) {
                    if (!(mR.user)) {
                        metaReader.userinfo=evt.data.userinfo;
                        mR.loginUser(mR.userinfo);
                        if (mR.mode==='login') setMode("cover");
                        mR.userSetup();}}
                else if (evt.data)
                    fdjtDOM("METABOOKINTRO",evt.data);
                else {}}
            if (Trace.messages)
                fdjtLog("Setting up message listener");
            fdjtDOM.addListener(window,"message",messageHandler);
            
            metaReader.TapHold.foot=
                new fdjtUI.TapHold(
                    metaReader.DOM.foot,
                    {override: true,holdfast: true,
                     taptapmsecs: 0,holdmsecs: 150,
                     minswipe:0});
            metaReader.TapHold.head=
                new TapHold(mR.DOM.head,
                            {override: true,taptapmsecs: 0,
                             holdmsecs: 200});
            metaReader.DOM.skimmer=$ID("METABOOKSKIMMER");
            metaReader.TapHold.skimmer=
                new TapHold(mR.DOM.skimmer,{taptapmsecs: 300});
            
            metaReader.DOM.sources=$ID("METABOOKSOURCES");
            metaReader.TapHold.sources=
                new TapHold(mR.DOM.sources,{taptapmsecs: 300});

            var help=mR.DOM.help=$ID("METABOOKHELP");
            help.innerHTML=fixStaticRefs(mR.HTML.help);

            /* Setup clouds */
            var dom_gloss_cloud=$ID("METABOOKGLOSSCLOUD");
            metaReader.gloss_cloud=
                new fdjtUI.Completions(
                    dom_gloss_cloud,$ID("METABOOKADDTAGINPUT"),
                    fdjtUI.FDJT_COMPLETE_OPTIONS|
                        fdjtUI.FDJT_COMPLETE_CLOUD|
                        fdjtUI.FDJT_COMPLETE_ANYWORD);
            metaReader.TapHold.gloss_cloud=new TapHold(mR.gloss_cloud.dom);

            metaReader.empty_cloud=
                new fdjtUI.Completions(
                    $ID("METABOOKALLTAGS"),false,
                    fdjtUI.FDJT_COMPLETE_OPTIONS|
                        fdjtUI.FDJT_COMPLETE_CLOUD|
                        fdjtUI.FDJT_COMPLETE_ANYWORD);
            if (mR.adjustCloudFont)
                metaReader.empty_cloud.updated=function(){
                    mR.adjustCloudFont(this);};
            metaReader.DOM.empty_cloud=$ID("METABOOKALLTAGS");
            metaReader.TapHold.empty_cloud=new TapHold(mR.empty_cloud.dom);
            
            var dom_share_cloud=$ID("METABOOKSHARECLOUD");
            metaReader.share_cloud=
                new fdjtUI.Completions(
                    dom_share_cloud,$ID("METABOOKADDSHAREINPUT"),
                    fdjtUI.FDJT_COMPLETE_OPTIONS|
                        fdjtUI.FDJT_COMPLETE_CLOUD|
                        fdjtUI.FDJT_COMPLETE_ANYWORD);
            metaReader.DOM.share_cloud=dom_share_cloud;
            metaReader.TapHold.share_cloud=new TapHold(mR.share_cloud.dom);

            fdjtDOM.setupCustomInputs($ID("METABOOKHUD"));

            if (Trace.startup>1)
                fdjtLog("Initialized basic HUD in %dms",fdjtTime()-started);}
        metaReader.initHUD=initHUD;
        
        function resizeHUD(){
            fdjt.DOM.adjustFonts(mR.HUD);}
        metaReader.resizeHUD=resizeHUD;

        /* Various UI methods */
        function addGloss2UI(item){
            if (!(item.frag)) {
                fdjtLog.warn(
                    "Warning: skipping gloss %o with no fragment identifier",
                    item.uuid);}
            else if (mbID(item.frag)) {
                var addGlossmark=mR.UI.addGlossmark;
                // Assume it belongs to the user if it doesn't say
                if ((!(item.maker))&&(mR.user))
                    item.maker=(mR.user);
                allglosses.addCards(item);
                var nodes=mR.getDups(item.frag);
                addClass(nodes,"glossed");
                var i=0, lim=nodes.length; while (i<lim) {
                    addGlossmark(nodes[i++],item);}
                if (item.excerpt) {
                    var range=mR.findExcerpt(
                        nodes,item.excerpt,item.exoff);
                    if (range) {
                        fdjtUI.Highlight(
                            range,"mbexcerpt",
                            item.note,{"data-glossid":item._id});}}
                if (item.tags) {
                    var gloss_cloud=mR.gloss_cloud;
                    var tags=item.tags, j=0, n_tags=tags.length;
                    while (j<n_tags)
                        mR.cloudEntry(tags[j++],gloss_cloud);}
                if (item.tstamp>mR.syncstamp)
                    metaReader.syncstamp=item.tstamp;}
            else {
                fdjtLog("Gloss (add2UI) refers to nonexistent '%s': %o",item.frag,item);
                return;}}
        metaReader.addGloss2UI=addGloss2UI;

        /* Creating the HUD */
        
        function setupTOC(root_info){
            var panel=fdjtDOM("div#METABOOKSTATICTOC.metareaderslice.mbtocslice.hudpanel");
            fdjtDOM.replace("METABOOKSTATICTOC",panel);
            var tocslice=new MetaBookTOC(root_info,panel);
            metaReader.tocslice=tocslice;
            metaReader.slices.statictoc=tocslice;
            metaReader.setupGestures(panel);
            return tocslice;}
        metaReader.setupTOC=setupTOC;

        /* HUD animation */

        function setHUD(flag,clearmode){
            if (typeof clearmode === 'undefined') clearmode=true;
            if ((Trace.gestures)||(Trace.mode))
                fdjtLog("setHUD(%s) %o mode=%o hudup=%o bc=%o hc=%o",
                        ((clearmode)?("clearmode"):("keepmode")),
                        flag,mR.mode,mR.hudup,
                        document.body.className,
                        hud.className);
            if (flag) {
                metaReader.hudup=true;
                dropClass(document.body,/\b(openhud|openglossmark)\b/g);
                dropClass(document.body,"mbSHOWHELP");
                addClass(document.body,"hudup");
                if (!(mR.mode)) addClass(document.body,"mbNOMODE");}
            else {
                metaReader.hudup=false;
                if (mR.previewing)
                    mR.stopPreview("setHUD");
                dropClass(document.body,"mbSHRINK");
                if (clearmode) {
                    if (mR.popmode) {
                        var fn=mR.popmode;
                        mR.popmode=false;
                        fn();}
                    dropClass(hud,"openheart");
                    dropClass(hud,"openhead");
                    dropClass(hud,"full");
                    dropClass(hud,metaReaderModes);
                    dropClass(mR.menu,metaReaderModes);
                    dropClass(document.body,"mbSKIMMING");
                    dropClass(document.body,"mbSKIMSTART");
                    dropClass(document.body,"mbSKIMEND");
                    addClass(document.body,"mbNOMODE");
                    metaReader.skimming=false;
                    if ((mR.mode)&&(mR.mode.search(metaReaderCoverModes)<0))
                        mR.mode=false;}
                dropClass(document.body,"hudup");
                dropClass(document.body,"openhud");
                mR.focusBody();}}
        metaReader.setHUD=setHUD;

        /* Opening and closing the cover */

        function showCover(){
            if (mR._started)
                fdjtState.dropLocal("mR("+mR.docid+").opened");
            setHUD(false);
            metaReader.closed=true;
            if (mR.covermode) {
                addClass(mR.cover,mR.covermode);
                metaReader.mode=metaReader.covermode;}
            addClass(document.body,"mbCOVER");}
        metaReader.showCover=showCover;
        function hideCover(){
            if (mR._started)
                fdjtState.setLocal(
                    "mR("+mR.docid+").opened",fdjtTime());
            metaReader.closed=false;
            dropClass(document.body,"mbCOVER");
            if (mR.mode) {
                metaReader.covermode=mR.mode;
                metaReader.mode=false;
                metaReader.cover.className="";}}
        metaReader.hideCover=hideCover;
        function toggleCover(){
            if (hasClass(document.body,"mbCOVER")) hideCover();
            else showCover();}
        metaReader.toggleCover=toggleCover;
        
        /* Mode controls */
        
        var metaReaderModes=/\b((search)|(refinesearch)|(expandsearch)|(searchresults)|(openglossmark)|(allglosses)|(context)|(statictoc)|(minimal)|(addgloss)|(gotoloc)|(gotoref)|(gotopage)|(shownote)|(showaside)|(glossdetail))\b/g;
        var metareaderHeartModes=/\b((statictoc)|(search)|(refinesearch)|(expandsearch)|(searchresults)|(allglosses)|(showaside)|(glossaddtag)|(glossaddtag)|(glossaddoutlet)|(glossdetail))\b/g;
        var metareaderHeadModes=/\b((search)|(refinesearch)|(expandsearch)|(searchresults)|(allglosses)|(addgloss)|(shownote))\b/g;
        var metaReaderPopModes=/\b((glossdetail))\b/g;
        var metaReaderCoverModes=/\b((cover)|(help)|(layers)|(login)|(settings)|(cover)|(aboutmetareaders)|(console)|(aboutbook)|(titlepage))\b/g;
        var metaReaderSearchModes=/((refinesearch)|(searchresults)|(expandsearch))/;
        metaReader.searchModes=metaReaderSearchModes;
        var metareader_mode_foci=
            {gotopage: "METABOOKPAGEINPUT",
             gotoloc: "METABOOKLOCINPUT",
             gotoref: "METABOOKREFINPUT",
             search: "METABOOKSEARCHINPUT",
             refinesearch: "METABOOKSEARCHINPUT",
             expandsearch: "METABOOKSEARCHINPUT"};
        
        function setMode(mode,nohud){
            var oldmode=mR.mode, mode_focus, mode_input;
            if (typeof mode === 'undefined') return oldmode;
            if (mode==='last') mode=mR.last_mode;
            if ((!(mode))&&(mR.mode)&&
                (mR.mode.search(metaReaderPopModes)>=0))
                mode=mR.last_mode;
            if (mode==='none') mode=false;
            if (mode==='heart') mode=mR.heart_mode||"statictoc";
            if (Trace.mode)
                fdjtLog("setMode %o, cur=%o dbc=%o",
                        mode,mR.mode,document.body.className);
            if ((mode!==mR.mode)&&(mR.previewing))
                mR.stopPreview("setMode");
            if ((mode!==mR.mode)&&(mR.popmode)) {
                var fn=mR.popmode;
                mR.popmode=false;
                fn();}
            if ((mode==="layers")&&
                (!($ID("BOOKHUBAPP").src))&&
                (!(mR.appinit)))
                mR.initIFrameApp();
            if ((mR.mode==="addgloss")&&(mode!=="addgloss")&&
                (hasClass("METABOOKLIVEGLOSS","modified")))
                mR.submitGloss($ID("METABOOKLIVEGLOSS"));
            if (mode) dropClass(document.body,"mbNOMODE");
            else addClass(document.body,"mbNOMODE");
            if (mode) {
                if (mode==="search") mode=mR.search_mode||"refinesearch";
                if (mode==="addgloss") {}
                else dropClass(document.body,"mbSHRINK");
                if (mode===true) {
                    /* True just puts up the HUD with no mode info */
                    mR.hideCover();
                    if (metareader_mode_foci[mR.mode]) {
                        mode_focus=metareader_mode_foci[mR.mode];
                        mode_input=
                            (((mode_focus.search(/[.#]/))>=0)?
                             (fdjtDOM.$1(mode_focus)):($ID(mode_focus)));
                        mode_input.blur();}
                    dropClass(hud,metaReaderModes);
                    dropClass(mR.menu,metaReaderModes);
                    metaReader.mode=false;
                    metaReader.last_mode=true;}
                else if (typeof mode !== 'string') 
                    throw new Error('mode arg not a string');
                else if (mode.search(metaReaderCoverModes)>=0) {
                    var cover=fdjt.ID("METABOOKCOVER");
                    if (mode==='login')
                        addClass(document.documentElement,'_SHOWLOGIN');
                    if (mode==="cover")
                        mode=cover.getAttribute("data-defaultclass")||"help";
                    if (mode!==mR.mode) {
                        cover.className=mode;
                        metaReader.mode=mode;
                        metaReader.modechange=fdjtTime();}
                    if (mode==="console") fdjtLog.update();
                    showCover();
                    return;}
                else if (mode===mR.mode) {}
                else {
                    mR.hideCover();
                    metaReader.modechange=fdjtTime();
                    if (metareader_mode_foci[mR.mode]) {
                        mode_focus=metareader_mode_foci[mR.mode];
                        mode_input=
                            (((mode_focus.search(/[.#]/))>=0)?
                             (fdjtDOM.$1(mode_focus)):($ID(mode_focus)));
                        mode_input.blur();}
                    if (mode!==mR.mode) metaReader.last_mode=mR.mode;
                    metaReader.mode=mode;}
                // If we're switching to the inner app but the iframe
                //  hasn't been initialized, we do it now.
                if ((mode==="bookhubapp")&&
                    (!($ID("BOOKHUBAPP").src))&&
                    (!(mR.appinit)))
                    initIFrameApp();

                if ((mode==='refinesearch')||
                    (mode==='searchresults')||
                    (mode==='expandsearch'))
                    metaReader.search_mode=mode;

                if (mode==='addgloss') 
                    addClass(document.body,"openhud");
                else if (mode==="openglossmark") {
                    addClass(document.body,"openhud");
                    addClass(document.body,"openglossmark");}
                else if (nohud) {}
                // And if we're not skimming, we just raise the hud
                else setHUD(true);
                // Actually change the class on the HUD object
                if (mode===true) {
                    dropClass(hud,"openhead");
                    dropClass(hud,"openheart");
                    fdjtDOM.swapClass(hud,metaReaderModes,"minimal");
                    fdjtDOM.swapClass(mR.menu,metaReaderModes,"minimal");}
                else if (mode==="addgloss") {
                    // addgloss has submodes which may specify the
                    //  open heart configuration
                    addClass(hud,"openhead");
                    dropClass(hud,"openheart");}
                else {
                    if (mode.search(metareaderHeartModes)<0) {
                        dropClass(hud,"openheart");}
                    if (mode.search(metareaderHeadModes)<0)
                        dropClass(hud,"openhead");
                    if (mode.search(metareaderHeartModes)>=0) {
                        metaReader.heart_mode=mode;
                        addClass(hud,"openheart");}
                    if (mode.search(metareaderHeadModes)>=0) {
                        metaReader.head_mode=mode;
                        addClass(hud,"openhead");}}
                changeMode(mode);}
            else {
                // Clearing the mode is a lot simpler, in part because
                //  setHUD clears most of the classes when it brings
                //  the HUD down.
                metaReader.last_mode=mR.mode;
                if (hasClass(document.body,"mbCOVER")) hideCover();
                if ((mR.mode==="openglossmark")&&
                    ($ID("METABOOKOPENGLOSSMARK"))) {
                    $ID("METABOOKOPENGLOSSMARK").id="";
                    dropClass(document.body,"openglossmark");}
                if (mR.textinput) {
                    mR.setFocus(false);}
                mR.focusBody();
                if (mR.skimpoint) {
                    var dups=mR.getDups(mR.target);
                    mR.clearHighlights(dups);
                    dropClass(dups,"mbhighlightpassage");}
                dropClass(hud,"openheart");
                dropClass(hud,"openhead");
                dropClass(document.body,"dimmed");
                dropClass(document.body,"mbSHOWHELP");
                dropClass(document.body,"mbPREVIEW");
                dropClass(document.body,"mbSHRINK");
                dropClass(hud,metaReaderModes);
                dropClass(mR.menu,metaReaderModes);
                metaReader.cxthelp=false;
                if (display_sync) mR.displaySync();
                if (nohud) mR.setHUD(false);
                else setHUD(false);}}
        
        function changeMode(mode){      
            if (Trace.mode)
                fdjtLog("changeMode %o, cur=%o dbc=%o",
                        mode,mR.mode,document.body.className);
            dropClass(mR.menu,metaReaderModes);
            dropClass(hud,metaReaderModes);
            addClass(hud,mode);
            addClass(mR.menu,mode);

            if ((mode!=="openglossmark")&&
                (mR.mode==="openglossmark")) {
                if ($ID("METABOOKOPENGLOSSMARK"))
                    $ID("METABOOKOPENGLOSSMARK").id="";
                dropClass(document.body,"openglossmark");}
            
            if (mode==="statictoc") {
                var headinfo=((mR.head)&&(mR.head.id)&&
                              (mR.docinfo[mR.head.id]));
                var static_head=$ID("MBTOC4"+headinfo.frag);
                var toc=fdjt.ID("METABOOKSTATICTOC");
                if (hasClass(toc,"mbsyncslice")) {
                    fdjt.showPage.check(toc);
                    if (static_head.offsetHeight===0)
                        fdjt.showPage.showNode(toc,static_head);}}
            else if (mR.slices[mode]) {
                var curloc=mR.location;
                var slice=mR.slices[mode];
                var slicediv=slice.container;
                slice.setLive(true);
                if (hasClass(slicediv,"mbsyncslice"))
                    slice.setLocation(curloc);}
            else if (mR.pagers[mode])
                fdjt.showPage.check(mR.pagers[mode]);
            else {}
            
            // We autofocus any input element appropriate to the mode
            if (metareader_mode_foci[mode]) {
                var mode_focus=metareader_mode_foci[mR.mode];
                var mode_input=
                    (((mode_focus.search(/[.#]/))>=0)?
                     (fdjtDOM.$1(mode_focus)):($ID(mode_focus)));
                if ((mode_input)&&
                    ((!(mR.touch))||
                     (hasParent(mode_input,mR.DOM.foot)))) {
                    mR.setFocus(mode_input);}}
            else if ((mode==="addgloss")&&(mR.glossform)) {
                var glossform=mR.glossform;
                var curglossmode=mR.getGlossMode(glossform);
                mR.setGlossMode(curglossmode,glossform);}
            // Moving the focus back to the body lets keys work
            else setTimeout(mR.focusBody,50);
            
            if (mR.slices[mode]) mR.slices[mode].setLive(true);

            if (display_sync) mR.displaySync();}

        function toggleMode(mode,keephud){
            if (!(mR.mode)) setMode(mode);
            else if (mode===mR.mode)
                if (keephud) setMode(true); else setMode(false);
            else if ((mode==='heart')&&
                     (mR.mode.search(metareaderHeartModes)===0))
                if (keephud) setMode(true); else setMode(false);
            else setMode(mode);}
        metaReader.toggleMode=toggleMode;

        metaReader.dropHUD=function(){return setMode(false);};
        metaReader.toggleHUD=function(evt){
            evt=evt||window.event;
            if ((evt)&&(fdjtUI.isClickable(fdjtUI.T(evt)))) return;
            fdjtLog("toggle HUD %o hudup=%o",evt,mR.hudup);
            if (mR.hudup) setHUD(false,false);
            else setHUD(true);};
        
        /* The App HUD */

        var iframe_app_init=false;
        function initIFrameApp(){
            if (iframe_app_init) return;
            if (mR.appinit) return;
            var server=fdjtState.getLocal('BOOKHUB.flyleaf')||
                fdjtState.getCookie('BOOKHUB.flyleaf')||
                mR.server;
            if (server==="sourcedomain") server=location.hostname;
            var query="";
            if (document.location.search) {
                if (document.location.search[0]==="?")
                    query=query+document.location.search.slice(1);
                else query=query+document.location.search;}
            if ((query.length)&&(query[query.length-1]!=="&"))
                query=query+"&";
            var refuri=mR.refuri;
            var appuri="https://"+server+"/flyleaf?"+query;
            if (query.search("REFURI=")<0)
                appuri=appuri+"REFURI="+encodeURIComponent(refuri);
            if (mR.mycopyid)
                appuri=appuri+"&MYCOPYID="+encodeURIComponent(mR.mycopyid);
            var app=$ID("BOOKHUBAPP");
            app.src=appuri;
            iframe_app_init=true;}
        metaReader.initIFrameApp=initIFrameApp;

        metaReader.selectApp=function(){
            if (mR.mode==='bookhubapp') setMode(false);
            else setMode('bookhubapp');};

        /* Skimming */

        function stopSkimming(){
            // Tapping the tochead returns to results/glosses/etc
            var skimming=mR.skimpoint;
            if (!(skimming)) return;
            if ((Trace.skimming)||(Trace.flips))
                fdjtLog("stopSkimming() %o",skimming);
            if (!(mR.skimming)) return;
            dropClass(document.body,"mbSKIMMING");
            mR.skimming=false;
            if (getParent(skimming,$ID("METABOOKALLGLOSSES"))) 
                setMode("allglosses");
            else if (getParent(skimming,$ID("METABOOKSTATICTOC"))) 
                setMode("statictoc");
            else if (getParent(skimming,$ID("METABOOKSEARCHRESULTS"))) 
                setMode("searchresults");
            else {}}
        metaReader.stopSkimming=stopSkimming;
        
        var rAF=fdjtDOM.requestAnimationFrame;

        function metaReaderSkimTo(card,dir,hudup){
            var skimmer=$ID("METABOOKSKIMMER");
            var skimpoint=mR.skimpoint;
            var slice=getSlice(card);
            if (!(slice)) {
                fdjtLog.warn("Can't determine slice for skimming to %o",card);
                return;}
            var cardinfo=slice.getInfo(card);
            if (!(cardinfo)) {
                fdjtLog.warn("No info for skimming to %s in %s",card,slice);
                return;}
            else card=cardinfo.dom||card;
            if ((slice.mode)&&(mR.mode!==slice.mode))
                setMode(slice.mode);
            var passage=mbID(cardinfo.passage||cardinfo.id);
            if (typeof dir !== "number") dir=0;
            if (hasParent(card,mR.DOM.allglosses))
                metaReader.skimming=mR.slices.allglosses;
            else if (hasParent(card,$ID("METABOOKSEARCHRESULTS")))
                metaReader.skimming=mR.slices.searchresults;
            else if (hasParent(card,$ID("METABOOKSTATICTOC")))
                metaReader.skimming=mR.slices.statictoc;
            else mR.skimming=true;
            if ((Trace.mode)||(Trace.skimming))
                fdjtLog("metaReaderSkim() %o (card=%o) mode=%o scn=%o/%o dir=%o",
                        passage,card,
                        mR.mode,mR.skimpoint,
                        mR.target,
                        dir);
            // Copy the description of what we're skimming into the
            // skimmer (at the top of the page during skimming and
            // preview)
            if (skimpoint!==card) {
                var clone=card.cloneNode(true);
                var pct=((dir<0)?("-120%"):(dir>0)?("120%"):(false));
                //dropClass(skimmer,"transimate");
                clone.id="METABOOKSKIM";
                fdjtDOM.replace("METABOOKSKIM",clone);
                if ((clone.offsetHeight)>skimmer.offsetHeight)
                    addClass(skimmer,"oversize");
                else dropClass(skimmer,"oversize");
                var dropTransAnimate=function(){
                    dropClass(skimmer,"transanimate");
                    fdjtDOM.removeListener(
                        skimmer,"transitionend",dropTransAnimate);};
                if ((skimpoint)&&(pct)) {
                    skimmer.style[fdjtDOM.transform]="translate3d(0,-110%,0)";
                    setTimeout(function(){
                        addClass(skimmer,"transanimate");
                        fdjtDOM.addListener(
                            skimmer,"transitionend",dropTransAnimate);
                        setTimeout(function(){
                            skimmer.style[fdjtDOM.transform]="";},
                                   0);},
                               0);}
                slice.setSkim(card);
                if (slice.atStart)
                    $ID("MBPAGELEFT").innerHTML="";
                else $ID("MBPAGELEFT").innerHTML=
                    "<span>-"+(slice.skimpos)+"</span>";
                if (slice.atEnd)
                    $ID("MBPAGERIGHT").innerHTML="";
                else $ID("MBPAGERIGHT").innerHTML=
                    "<span>"+(slice.visible.length-slice.skimpos-1)+
                    "+</span>";
                // This marks where we are currently skimming
                if (skimpoint) dropClass(skimpoint,"skimpoint");
                if (card) addClass(card,"skimpoint");
                metaReader.skimpoint=card;}
            else {}
            skimMode(slice);
            if (typeof hudup !== 'undefined')
                setHUD(hudup,false);
            mR.GoTo(passage,"Skim");
            setSkimTarget(passage);
            highlightSkimTarget(passage,card);}
        metaReader.SkimTo=function(card,dir){
            rAF(function(){metaReaderSkimTo(card,dir);});};
        metaReader.SkimTo=metaReaderSkimTo;

        function skimMode(slice){
            var body=document.body, skimmer=$ID("METABOOKSKIMMER");
            addClass(body,"mbSKIMMING");
            // This all makes sure that the >| and |< buttons
            // appear appropriately
            if (slice.atEnd)
                addClass(body,"mbSKIMEND");
            else dropClass(body,"mbSKIMEND");
            if (slice.atStart)
                addClass(body,"mbSKIMSTART");
            else dropClass(body,"mbSKIMSTART");
            dropClass(skimmer,"mbfoundhighlights");}
        function setSkimTarget(passage){
            if (mR.target)
                mR.clearHighlights(mR.getDups(mR.target));
            mR.setTarget(passage);}
        function highlightSkimTarget(passage,card){
            var highlights=[];
            if ((card)&&(hasClass(card,"gloss"))) {
                var glossinfo=mR.glossdb.ref(card.name);
                if (glossinfo.excerpt) {
                    var searching=mR.getDups(passage.id);
                    var range=mR.findExcerpt(
                        searching,glossinfo.excerpt,glossinfo.exoff);
                    if (range) {
                        highlights=
                            fdjtUI.Highlight(range,"mbhighlightexcerpt");
                        addClass("METABOOKSKIMMER","mbfoundhighlights");}}
                else if (card.about[0]==="#")
                    addClass(mR.getDups(card.about.slice(1)),
                             "mbhighlightpassage");
                else addClass(mR.getDups(card.about),
                              "mbhighlightpassage");}
            else if ((card)&&(getParent(card,".searchslice"))) {
                var about=card.about, target=mbID(about);
                if (target) {
                    var info=mR.docinfo[target.id];
                    var terms=mR.query.tags;
                    var spellings=info.knodeterms;
                    var i=0, lim=terms.length;
                    if (lim===0)
                        addClass(mR.getDups(target),
                                 "mbhighlightpassage");
                    else while (i<lim) {
                        var term=terms[i++];
                        var h=mR.highlightTerm(term,target,info,spellings);
                        highlights=highlights.concat(h);}}}
            else {}}

        function getSlice(card){
            var cur_slice=mR.slices[mR.mode];
            if ((cur_slice)&&(cur_slice.getInfo(card)))
                return cur_slice;
            else if (card.nodeType) {
                if (hasParent(card,mR.DOM.allglosses))
                    return mR.slices.allglosses;
                else if (hasParent(card,$ID("METABOOKSEARCHRESULTS")))
                    return mR.searchresults;
                else return false;}
            else if (typeof card === "string") {
                if (mR.glossdb.probe(card))
                    return mR.slices.allglosses;
                else if (mR.docinfo[card])
                    return mR.slices.statictoc;
                else return false;}
            else return false;}
        metaReader.getSlice=getSlice;

        metaReader.addConfig("uisize",function(name,value){
            fdjtDOM.swapClass(
                mR.Frame,/metareaderuifont\w+/g,"metareaderuifont"+value);
            fdjt.Async(function(){mR.resizeUI();});
            fdjt.Async(function(){
                mR.updateSettings(name,value);});});
        metaReader.addConfig("dyslexical",function(name,value){
            var root=document.documentElement||document.body;
            if ((value)&&(typeof value === 'string')&&
                (/yes|on|t/i.exec(value))) {
                if (hasClass(root,"_DYSLEXICAL")) return;
                else {
                    metaReader.dyslexical=true;
                    addClass(root,"_DYSLEXICAL");}}
            else if (!(hasClass(root,"_DYSLEXICAL")))
                return;
            else {
                metaReader.dyslexical=false;
                fdjtDOM.dropClass(root,"_DYSLEXICAL");}
            fdjt.Async(function(){
                mR.resizeUI();
                if (mR.layout) mR.Paginate("typechange");},
                       10);});
        metaReader.addConfig("animatecontent",function(name,value){
            if (mR.dontanimate) {}
            else if (value) addClass(document.body,"_ANIMATE");
            else dropClass(document.body,"_ANIMATE");
            fdjt.Async(function(){
                mR.updateSettings(name,value);});});
        metaReader.addConfig("animatehud",function(name,value){
            if (mR.dontanimate) {}
            else if (value) addClass("METABOOKFRAME","_ANIMATE");
            else dropClass("METABOOKFRAME","_ANIMATE");
            fdjt.Async(function(){
                mR.updateSettings(name,value);});});

        /* Settings apply/save handlers */

        function keyboardHelp(arg,force){
            if (arg===true) {
                if (mR.keyboardHelp.timer) {
                    clearTimeout(mR.keyboardHelp.timer);
                    mR.keyboardHelp.timer=false;}
                dropClass("METABOOKKEYBOARDHELPBOX","closing");
                dropClass("METABOOKKEYBOARDHELPBOX","closed");
                return;}
            else if (arg===false) {
                if (mR.keyboardHelp.timer) {
                    clearTimeout(mR.keyboardHelp.timer);
                    mR.keyboardHelp.timer=false;}
                addClass("METABOOKKEYBOARDHELPBOX","closed");
                dropClass("METABOOKKEYBOARDHELPBOX","closing");
                return;}
            if ((!force)&&(!(mR.keyboardhelp))) return;
            if (typeof arg === 'string') arg=$ID(arg);
            if ((!(arg))||(!(arg.nodeType))) return;
            var box=$ID("METABOOKKEYBOARDHELPBOX");
            var content=arg.cloneNode(true);
            content.id="METABOOKKEYBOARDHELP";
            fdjtDOM.replace("METABOOKKEYBOARDHELP",content);
            fdjtDOM.dropClass(box,"closed");
            metaReader.keyboardHelp.timer=
                setTimeout(function(){
                    fdjtDOM.addClass(box,"closing");
                    metaReader.keyboardHelp.timer=
                        setTimeout(function(){
                            metaReader.keyboardHelp.timer=false;
                            fdjtDOM.swapClass(box,"closing","closed");},
                                   5000);},
                           5000);}
        metaReader.keyboardHelp=keyboardHelp;

        /* Showing a particular gloss */

        metaReader.showGloss=function showGloss(uuid){
            if (!(mR.glossdb.ref(uuid))) return false;
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
                        mR.SkimTo(src);
                        return true;}}
                return false;}};

        /* Setting/clearing help mode */
        metaReader.hideHelp=function(){
            fdjtDOM.dropClass(document.body,"mbSHOWHELP");};
        metaReader.showHelp=function(){
            fdjtDOM.addClass(document.body,"mbSHOWHELP");};

        return setMode;})();



/* Emacs local variables
   ;;;  Local variables: ***
   ;;;  compile-command: "cd ..; make" ***
   ;;;  indent-tabs-mode: nil ***
   ;;;  End: ***
*/
