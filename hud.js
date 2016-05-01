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

metaBook.setMode=
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
        var mbID=metaBook.ID;
        
        var mB=metaBook;
        var Trace=mB.Trace;

        var MetaBookTOC=mB.TOCSlice;

        // Helpful dimensions
        // Whether to call displaySync on mode changes
        var display_sync=false;
        
        var addClass=fdjtDOM.addClass;
        var dropClass=fdjtDOM.dropClass;
        var hasClass=fdjtDOM.hasClass;
        var getParent=fdjtDOM.getParent;
        var hasParent=fdjtDOM.hasParent;
        var hasSuffix=fdjtString.hasSuffix;

        var fixStaticRefs=mB.fixStaticRefs;

        var metaBookHUD=false;

        // This will contain the interactive input console (for debugging)
        var frame=false, hud=false;
        var allglosses=false;

        function initHUD(){
            if ($ID("METABOOKHUD")) return;
            var started=fdjtTime();
            var messages=fdjtDOM("div#METABOOKSTARTUPMESSAGES.startupmessages");
            messages.innerHTML=fixStaticRefs(metaBook.HTML.messages);
            if (Trace.startup>2) fdjtLog("Initializing HUD layout");
            metaBook.HUD=metaBookHUD=hud=
                fdjtDOM("div#METABOOKHUD.metabookhud");
            hud.innerHTML=fixStaticRefs(mB.HTML.hud);
            hud.metabookui=true;
            fdjtDOM.append(messages);
            if ($ID("METABOOKFRAME")) frame=$ID("METABOOKFRAME");
            else {
                frame=fdjtDOM("div#METABOOKFRAME");
                if ((!(mB.dontanimate))&&(mB.getConfig("animatehud")))
                    addClass(frame,"_ANIMATE");
                fdjtDOM.prepend(document.body,frame);}
            addClass(frame,"metabookframe");
            addClass(frame,"tapholdcontext");
            frame.appendChild(messages); frame.appendChild(hud);
            if (mB.getConfig("uisize"))
                addClass(frame,"metabookuifont"+mB.getConfig("uisize"));
            metaBook.Frame=frame;
            // Fill in the HUD help
            var hudhelp=$ID("METABOOKHUDHELP");
            hudhelp.innerHTML=fixStaticRefs(mB.HTML.hudhelp);
            // Fill in the HUD help
            var helptext=$ID("METABOOKAPPHELP");
            helptext.innerHTML=fixStaticRefs(mB.HTML.help);
            // Setup heart
            var heart=$ID("METABOOKHEARTBODY");
            heart.innerHTML=fixStaticRefs(mB.HTML.heart);
            metaBook.DOM.heart=heart;
            var gloss_attach=$ID("METABOOKGLOSSATTACH");
            gloss_attach.innerHTML=fixStaticRefs(mB.HTML.attach);
            metaBook.DOM.heart=heart;
            // Other HUD parts
            metaBook.DOM.head=$ID("METABOOKHEAD");
            metaBook.DOM.heart=$ID("METABOOKHEARTBODY");
            metaBook.DOM.foot=$ID("METABOOKFOOT");
            metaBook.DOM.tabs=$ID("METABOOKTABS");

            metaBook.DOM.noteshud=$ID("METABOOKNOTETEXT");
            metaBook.DOM.asidehud=$ID("METABOOKASIDE");

            // Initialize the pagebar
            metaBook.DOM.pagebar=$ID("METABOOKPAGEBAR");
            
            // Initialize search UI
            var search=$ID("METABOOKSEARCH");
            search.innerHTML=fixStaticRefs(mB.HTML.searchbox);
            addClass(mB.HUD,"emptysearch");

            // Setup addgloss prototype
            var addgloss=$ID("METABOOKADDGLOSSPROTOTYPE");
            addgloss.innerHTML=fixStaticRefs(mB.HTML.addgloss);

            metaBook.UI.addHandlers(hud,"hud");

            if (Trace.startup>1)
                fdjtLog("Created basic HUD in %dms",fdjtTime()-started);

            if (!(mB.svg)) {
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

            fdjtDOM.setInputs(".metabookrefuri",mB.refuri);
            fdjtDOM.setInputs(".metabookdocuri",mB.docuri);
            fdjtDOM.setInputs(".metabooktopuri",mB.topuri);
            
            // Initialize gloss UI
            metaBook.DOM.allglosses=$ID("METABOOKALLGLOSSES");
            if ((Trace.startup>2)&&(mB.DOM.allglosses))
                fdjtLog("Setting up gloss UI %o",allglosses);

            metaBook.slices.allglosses=allglosses=
                new mB.Slice(mB.DOM.allglosses);
            metaBook.slices.allglosses.mode="allglosses";
            metaBook.glossdb.onAdd("maker",function(f,p,v){
                mB.sourcedb.ref(v).oninit
                (mB.UI.addGlossSource,"newsource");});
            metaBook.glossdb.onAdd("sources",function(f,p,v){
                mB.sourcedb.ref(v).oninit
                (mB.UI.addGlossSource,"newsource");});
            metaBook.glossdb.onLoad(addGloss2UI);
            
            function messageHandler(evt){
                var origin=evt.origin;
                if (Trace.messages)
                    fdjtLog("Got a message from %s with payload %j",origin,evt.data);
                if (origin.search(/https:\/\/[^\/]+.(bookhub\.io|metabooks\.net)/)!==0) {
                    fdjtLog.warn("Rejecting insecure message from %s: %s",
                                 origin,evt.data);
                    return;}
                if (evt.data==="sbooksapp") {
                    setMode("sbooksapp");}
                else if (evt.data==="metabooksapp") {
                    setMode("sbooksapp");}
                else if (evt.data==="loggedin") {
                    if (!(mB.user)) {
                        mB.userSetup();}}
                else if ((typeof evt.data === "string")&&
                         (evt.data.search("setuser=")===0)) {
                    if (!(mB.user)) {
                        metaBook.userinfo=JSON.parse(evt.data.slice(8));
                        mB.loginUser(mB.userinfo);
                        if (mB.mode==='login') setMode("cover");
                        mB.userSetup();}}
                else if (evt.data.updateglosses) {
                    mB.updateInfo();}
                else if (evt.data.addlayer) {
                    mB.updateInfo();}
                else if ((evt.data.droplayer)||(evt.data.hidelayer)||
                         (evt.data.showlayer)) {
                    mB.refreshOffline();}
                else if (evt.data.userinfo) {
                    if (!(mB.user)) {
                        metaBook.userinfo=evt.data.userinfo;
                        mB.loginUser(mB.userinfo);
                        if (mB.mode==='login') setMode("cover");
                        mB.userSetup();}}
                else if (evt.data)
                    fdjtDOM("METABOOKINTRO",evt.data);
                else {}}
            if (Trace.messages)
                fdjtLog("Setting up message listener");
            fdjtDOM.addListener(window,"message",messageHandler);
            
            metaBook.TapHold.foot=
                new fdjtUI.TapHold(
                    metaBook.DOM.foot,
                    {override: true,holdfast: true,
                     taptapmsecs: 0,holdmsecs: 150,
                     minswipe:0});
            metaBook.TapHold.head=
                new TapHold(mB.DOM.head,
                            {override: true,taptapmsecs: 0,
                             holdmsecs: 200});
            metaBook.DOM.skimmer=$ID("METABOOKSKIMMER");
            metaBook.TapHold.skimmer=
                new TapHold(mB.DOM.skimmer,{taptapmsecs: 300});
            
            metaBook.DOM.sources=$ID("METABOOKSOURCES");
            metaBook.TapHold.sources=
                new TapHold(mB.DOM.sources,{taptapmsecs: 300});

            var help=mB.DOM.help=$ID("METABOOKHELP");
            help.innerHTML=fixStaticRefs(mB.HTML.help);

            /* Setup clouds */
            var dom_gloss_cloud=$ID("METABOOKGLOSSCLOUD");
            metaBook.gloss_cloud=
                new fdjtUI.Completions(
                    dom_gloss_cloud,$ID("METABOOKADDTAGINPUT"),
                    fdjtUI.FDJT_COMPLETE_OPTIONS|
                        fdjtUI.FDJT_COMPLETE_CLOUD|
                        fdjtUI.FDJT_COMPLETE_ANYWORD);
            metaBook.TapHold.gloss_cloud=new TapHold(mB.gloss_cloud.dom);

            metaBook.empty_cloud=
                new fdjtUI.Completions(
                    $ID("METABOOKALLTAGS"),false,
                    fdjtUI.FDJT_COMPLETE_OPTIONS|
                        fdjtUI.FDJT_COMPLETE_CLOUD|
                        fdjtUI.FDJT_COMPLETE_ANYWORD);
            if (mB.adjustCloudFont)
                metaBook.empty_cloud.updated=function(){
                    mB.adjustCloudFont(this);};
            metaBook.DOM.empty_cloud=$ID("METABOOKALLTAGS");
            metaBook.TapHold.empty_cloud=new TapHold(mB.empty_cloud.dom);
            
            var dom_share_cloud=$ID("METABOOKSHARECLOUD");
            metaBook.share_cloud=
                new fdjtUI.Completions(
                    dom_share_cloud,$ID("METABOOKADDSHAREINPUT"),
                    fdjtUI.FDJT_COMPLETE_OPTIONS|
                        fdjtUI.FDJT_COMPLETE_CLOUD|
                        fdjtUI.FDJT_COMPLETE_ANYWORD);
            metaBook.DOM.share_cloud=dom_share_cloud;
            metaBook.TapHold.share_cloud=new TapHold(mB.share_cloud.dom);

            fdjtDOM.setupCustomInputs($ID("METABOOKHUD"));

            if (Trace.startup>1)
                fdjtLog("Initialized basic HUD in %dms",fdjtTime()-started);}
        metaBook.initHUD=initHUD;
        
        function resizeHUD(){
            fdjt.DOM.adjustFonts(mB.HUD);}
        metaBook.resizeHUD=resizeHUD;

        /* Various UI methods */
        function addGloss2UI(item){
            if (!(item.frag)) {
                fdjtLog.warn(
                    "Warning: skipping gloss %o with no fragment identifier",
                    item.uuid);}
            else if (mbID(item.frag)) {
                var addGlossmark=mB.UI.addGlossmark;
                // Assume it belongs to the user if it doesn't say
                if ((!(item.maker))&&(mB.user))
                    item.maker=(mB.user);
                allglosses.addCards(item);
                var nodes=mB.getDups(item.frag);
                addClass(nodes,"glossed");
                var i=0, lim=nodes.length; while (i<lim) {
                    addGlossmark(nodes[i++],item);}
                if (item.excerpt) {
                    var range=mB.findExcerpt(
                        nodes,item.excerpt,item.exoff);
                    if (range) {
                        fdjtUI.Highlight(
                            range,"mbexcerpt",
                            item.note,{"data-glossid":item._id});}}
                if (item.tags) {
                    var gloss_cloud=mB.gloss_cloud;
                    var tags=item.tags, j=0, n_tags=tags.length;
                    while (j<n_tags)
                        mB.cloudEntry(tags[j++],gloss_cloud);}
                if (item.tstamp>mB.syncstamp)
                    metaBook.syncstamp=item.tstamp;}
            else {
                fdjtLog("Gloss (add2UI) refers to nonexistent '%s': %o",item.frag,item);
                return;}}
        metaBook.addGloss2UI=addGloss2UI;

        /* Creating the HUD */
        
        function setupTOC(root_info){
            var panel=fdjtDOM("div#METABOOKSTATICTOC.metabookslice.mbtocslice.hudpanel");
            fdjtDOM.replace("METABOOKSTATICTOC",panel);
            var tocslice=new MetaBookTOC(root_info,panel);
            metaBook.tocslice=tocslice;
            metaBook.slices.statictoc=tocslice;
            metaBook.setupGestures(panel);
            return tocslice;}
        metaBook.setupTOC=setupTOC;

        /* HUD animation */

        function setHUD(flag,clearmode){
            if (typeof clearmode === 'undefined') clearmode=true;
            if ((Trace.gestures)||(Trace.mode))
                fdjtLog("setHUD(%s) %o mode=%o hudup=%o bc=%o hc=%o",
                        ((clearmode)?("clearmode"):("keepmode")),
                        flag,mB.mode,mB.hudup,
                        document.body.className,
                        hud.className);
            if (flag) {
                metaBook.hudup=true;
                dropClass(document.body,/\b(openhud|openglossmark)\b/g);
                dropClass(document.body,"mbSHOWHELP");
                addClass(document.body,"hudup");
                if (!(mB.mode)) addClass(document.body,"mbNOMODE");}
            else {
                metaBook.hudup=false;
                if (mB.previewing)
                    mB.stopPreview("setHUD");
                dropClass(document.body,"mbSHRINK");
                if (clearmode) {
                    if (mB.popmode) {
                        var fn=mB.popmode;
                        mB.popmode=false;
                        fn();}
                    dropClass(hud,"openheart");
                    dropClass(hud,"openhead");
                    dropClass(hud,"full");
                    dropClass(hud,metaBookModes);
                    dropClass(mB.menu,metaBookModes);
                    dropClass(document.body,"mbSKIMMING");
                    dropClass(document.body,"mbSKIMSTART");
                    dropClass(document.body,"mbSKIMEND");
                    addClass(document.body,"mbNOMODE");
                    metaBook.skimming=false;
                    if ((mB.mode)&&(mB.mode.search(metaBookCoverModes)<0))
                        mB.mode=false;}
                dropClass(document.body,"hudup");
                dropClass(document.body,"openhud");
                mB.focusBody();}}
        metaBook.setHUD=setHUD;

        /* Opening and closing the cover */

        function showCover(){
            if (mB._started)
                fdjtState.dropLocal("mB("+mB.docid+").opened");
            setHUD(false);
            metaBook.closed=true;
            if (mB.covermode) {
                addClass(mB.cover,mB.covermode);
                metaBook.mode=metaBook.covermode;}
            addClass(document.body,"mbCOVER");}
        metaBook.showCover=showCover;
        function hideCover(){
            if (mB._started)
                fdjtState.setLocal(
                    "mB("+mB.docid+").opened",fdjtTime());
            metaBook.closed=false;
            dropClass(document.body,"mbCOVER");
            if (mB.mode) {
                metaBook.covermode=mB.mode;
                metaBook.mode=false;
                metaBook.cover.className="";}}
        metaBook.hideCover=hideCover;
        function toggleCover(){
            if (hasClass(document.body,"mbCOVER")) hideCover();
            else showCover();}
        metaBook.toggleCover=toggleCover;
        
        /* Mode controls */
        
        var metaBookModes=/\b((search)|(refinesearch)|(expandsearch)|(searchresults)|(openglossmark)|(allglosses)|(context)|(statictoc)|(minimal)|(addgloss)|(gotoloc)|(gotoref)|(gotopage)|(shownote)|(showaside)|(glossdetail))\b/g;
        var metabookHeartModes=/\b((statictoc)|(search)|(refinesearch)|(expandsearch)|(searchresults)|(allglosses)|(showaside)|(glossaddtag)|(glossaddtag)|(glossaddoutlet)|(glossdetail))\b/g;
        var metabookHeadModes=/\b((search)|(refinesearch)|(expandsearch)|(searchresults)|(allglosses)|(addgloss)|(shownote))\b/g;
        var metaBookPopModes=/\b((glossdetail))\b/g;
        var metaBookCoverModes=/\b((cover)|(help)|(layers)|(login)|(settings)|(cover)|(aboutsbooks)|(aboutmetabooks)|(console)|(aboutbook)|(titlepage))\b/g;
        var metaBookSearchModes=/((refinesearch)|(searchresults)|(expandsearch))/;
        metaBook.searchModes=metaBookSearchModes;
        var metabook_mode_foci=
            {gotopage: "METABOOKPAGEINPUT",
             gotoloc: "METABOOKLOCINPUT",
             gotoref: "METABOOKREFINPUT",
             search: "METABOOKSEARCHINPUT",
             refinesearch: "METABOOKSEARCHINPUT",
             expandsearch: "METABOOKSEARCHINPUT"};
        
        function setMode(mode,nohud){
            var oldmode=mB.mode, mode_focus, mode_input;
            if (typeof mode === 'undefined') return oldmode;
            if (mode==='last') mode=mB.last_mode;
            if ((!(mode))&&(mB.mode)&&
                (mB.mode.search(metaBookPopModes)>=0))
                mode=mB.last_mode;
            if (mode==='none') mode=false;
            if (mode==='heart') mode=mB.heart_mode||"statictoc";
            if (Trace.mode)
                fdjtLog("setMode %o, cur=%o dbc=%o",
                        mode,mB.mode,document.body.className);
            if ((mode!==mB.mode)&&(mB.previewing))
                mB.stopPreview("setMode");
            if ((mode!==mB.mode)&&(mB.popmode)) {
                var fn=mB.popmode;
                mB.popmode=false;
                fn();}
            if ((mode==="layers")&&
                (!($ID("BOOKHUBAPP").src))&&
                (!(mB.appinit)))
                mB.initIFrameApp();
            if ((mB.mode==="addgloss")&&(mode!=="addgloss")&&
                (hasClass("METABOOKLIVEGLOSS","modified")))
                mB.submitGloss($ID("METABOOKLIVEGLOSS"));
            if (mode) dropClass(document.body,"mbNOMODE");
            else addClass(document.body,"mbNOMODE");
            if (mode) {
                if (mode==="search") mode=mB.search_mode||"refinesearch";
                if (mode==="addgloss") {}
                else dropClass(document.body,"mbSHRINK");
                if (mode===true) {
                    /* True just puts up the HUD with no mode info */
                    mB.hideCover();
                    if (metabook_mode_foci[mB.mode]) {
                        mode_focus=metabook_mode_foci[mB.mode];
                        mode_input=
                            (((mode_focus.search(/[.#]/))>=0)?
                             (fdjtDOM.$1(mode_focus)):($ID(mode_focus)));
                        mode_input.blur();}
                    dropClass(hud,metaBookModes);
                    dropClass(mB.menu,metaBookModes);
                    metaBook.mode=false;
                    metaBook.last_mode=true;}
                else if (typeof mode !== 'string') 
                    throw new Error('mode arg not a string');
                else if (mode.search(metaBookCoverModes)>=0) {
                    var cover=fdjt.ID("METABOOKCOVER");
                    if (mode==='login')
                        addClass(document.documentElement,'_SHOWLOGIN');
                    if (mode==="cover")
                        mode=cover.getAttribute("data-defaultclass")||"help";
                    if (mode!==mB.mode) {
                        cover.className=mode;
                        metaBook.mode=mode;
                        metaBook.modechange=fdjtTime();}
                    if (mode==="console") fdjtLog.update();
                    showCover();
                    return;}
                else if (mode===mB.mode) {}
                else {
                    mB.hideCover();
                    metaBook.modechange=fdjtTime();
                    if (metabook_mode_foci[mB.mode]) {
                        mode_focus=metabook_mode_foci[mB.mode];
                        mode_input=
                            (((mode_focus.search(/[.#]/))>=0)?
                             (fdjtDOM.$1(mode_focus)):($ID(mode_focus)));
                        mode_input.blur();}
                    if (mode!==mB.mode) metaBook.last_mode=mB.mode;
                    metaBook.mode=mode;}
                // If we're switching to the inner app but the iframe
                //  hasn't been initialized, we do it now.
                if ((mode==="sbooksapp")&&
                    (!($ID("BOOKHUBAPP").src))&&
                    (!(mB.appinit)))
                    initIFrameApp();

                if ((mode==='refinesearch')||
                    (mode==='searchresults')||
                    (mode==='expandsearch'))
                    metaBook.search_mode=mode;

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
                    fdjtDOM.swapClass(hud,metaBookModes,"minimal");
                    fdjtDOM.swapClass(mB.menu,metaBookModes,"minimal");}
                else if (mode==="addgloss") {
                    // addgloss has submodes which may specify the
                    //  open heart configuration
                    addClass(hud,"openhead");
                    dropClass(hud,"openheart");}
                else {
                    if (mode.search(metabookHeartModes)<0) {
                        dropClass(hud,"openheart");}
                    if (mode.search(metabookHeadModes)<0)
                        dropClass(hud,"openhead");
                    if (mode.search(metabookHeartModes)>=0) {
                        metaBook.heart_mode=mode;
                        addClass(hud,"openheart");}
                    if (mode.search(metabookHeadModes)>=0) {
                        metaBook.head_mode=mode;
                        addClass(hud,"openhead");}}
                changeMode(mode);}
            else {
                // Clearing the mode is a lot simpler, in part because
                //  setHUD clears most of the classes when it brings
                //  the HUD down.
                metaBook.last_mode=mB.mode;
                if (hasClass(document.body,"mbCOVER")) hideCover();
                if ((mB.mode==="openglossmark")&&
                    ($ID("METABOOKOPENGLOSSMARK"))) {
                    $ID("METABOOKOPENGLOSSMARK").id="";
                    dropClass(document.body,"openglossmark");}
                if (mB.textinput) {
                    mB.setFocus(false);}
                mB.focusBody();
                if (mB.skimpoint) {
                    var dups=mB.getDups(mB.target);
                    mB.clearHighlights(dups);
                    dropClass(dups,"mbhighlightpassage");}
                dropClass(hud,"openheart");
                dropClass(hud,"openhead");
                dropClass(document.body,"dimmed");
                dropClass(document.body,"mbSHOWHELP");
                dropClass(document.body,"mbPREVIEW");
                dropClass(document.body,"mbSHRINK");
                dropClass(hud,metaBookModes);
                dropClass(mB.menu,metaBookModes);
                metaBook.cxthelp=false;
                if (display_sync) mB.displaySync();
                if (nohud) mB.setHUD(false);
                else setHUD(false);}}
        
        function changeMode(mode){      
            if (Trace.mode)
                fdjtLog("changeMode %o, cur=%o dbc=%o",
                        mode,mB.mode,document.body.className);
            dropClass(mB.menu,metaBookModes);
            dropClass(hud,metaBookModes);
            addClass(hud,mode);
            addClass(mB.menu,mode);

            if ((mode!=="openglossmark")&&
                (mB.mode==="openglossmark")) {
                if ($ID("METABOOKOPENGLOSSMARK"))
                    $ID("METABOOKOPENGLOSSMARK").id="";
                dropClass(document.body,"openglossmark");}
            
            if (mode==="statictoc") {
                var headinfo=((mB.head)&&(mB.head.id)&&
                              (mB.docinfo[mB.head.id]));
                var static_head=$ID("MBTOC4"+headinfo.frag);
                var toc=fdjt.ID("METABOOKSTATICTOC");
                if (hasClass(toc,"mbsyncslice")) {
                    fdjt.showPage.check(toc);
                    if (static_head.offsetHeight===0)
                        fdjt.showPage.showNode(toc,static_head);}}
            else if (mB.slices[mode]) {
                var curloc=mB.location;
                var slice=mB.slices[mode];
                var slicediv=slice.container;
                slice.setLive(true);
                if (hasClass(slicediv,"mbsyncslice"))
                    slice.setLocation(curloc);}
            else if (mB.pagers[mode])
                fdjt.showPage.check(mB.pagers[mode]);
            else {}
            
            // We autofocus any input element appropriate to the mode
            if (metabook_mode_foci[mode]) {
                var mode_focus=metabook_mode_foci[mB.mode];
                var mode_input=
                    (((mode_focus.search(/[.#]/))>=0)?
                     (fdjtDOM.$1(mode_focus)):($ID(mode_focus)));
                if ((mode_input)&&
                    ((!(mB.touch))||
                     (hasParent(mode_input,mB.DOM.foot)))) {
                    setTimeout(function(){
                        mB.setFocus(mode_input);},
                               50);}}
            else if ((mode==="addgloss")&&(mB.glossform)) {
                var glossform=mB.glossform;
                var curglossmode=mB.getGlossMode(glossform);
                mB.setGlossMode(curglossmode,glossform);}
            // Moving the focus back to the body lets keys work
            else setTimeout(mB.focusBody,50);
            
            if (mB.slices[mode]) mB.slices[mode].setLive(true);

            if (display_sync) mB.displaySync();}

        function toggleMode(mode,keephud){
            if (!(mB.mode)) setMode(mode);
            else if (mode===mB.mode)
                if (keephud) setMode(true); else setMode(false);
            else if ((mode==='heart')&&
                     (mB.mode.search(metabookHeartModes)===0))
                if (keephud) setMode(true); else setMode(false);
            else setMode(mode);}
        metaBook.toggleMode=toggleMode;

        metaBook.dropHUD=function(){return setMode(false);};
        metaBook.toggleHUD=function(evt){
            evt=evt||window.event;
            if ((evt)&&(fdjtUI.isClickable(fdjtUI.T(evt)))) return;
            fdjtLog("toggle HUD %o hudup=%o",evt,mB.hudup);
            if (mB.hudup) setHUD(false,false);
            else setHUD(true);};
        
        /* The App HUD */

        var iframe_app_init=false;
        function initIFrameApp(){
            if (iframe_app_init) return;
            if (mB.appinit) return;
            var query="";
            if (document.location.search) {
                if (document.location.search[0]==="?")
                    query=query+document.location.search.slice(1);
                else query=query+document.location.search;}
            if ((query.length)&&(query[query.length-1]!=="&"))
                query=query+"&";
            var refuri=mB.refuri;
            var appuri="https://"+mB.server+"/flyleaf?"+query;
            if (query.search("REFURI=")<0)
                appuri=appuri+"REFURI="+encodeURIComponent(refuri);
            if (query.search("TOPURI=")<0)
                appuri=appuri+"&TOPURI="+
                encodeURIComponent(document.location.href);
            if (document.title) {
                appuri=appuri+"&DOCTITLE="+encodeURIComponent(document.title);}
            if (mB.user) {
                appuri=appuri+"&BOOKUSER="+encodeURIComponent(mB.user._id);}
            if (document.location.hash) {
                appuri=appuri+"&HASH="+document.location.hash.slice(1);}

            var app=$ID("BOOKHUBAPP");
            app.src=appuri;
            iframe_app_init=true;}
        metaBook.initIFrameApp=initIFrameApp;

        metaBook.selectApp=function(){
            if (mB.mode==='sbooksapp') setMode(false);
            else setMode('sbooksapp');};

        /* Skimming */

        function stopSkimming(){
            // Tapping the tochead returns to results/glosses/etc
            var skimming=mB.skimpoint;
            if (!(skimming)) return;
            if ((Trace.skimming)||(Trace.flips))
                fdjtLog("stopSkimming() %o",skimming);
            if (!(mB.skimming)) return;
            dropClass(document.body,"mbSKIMMING");
            mB.skimming=false;
            if (getParent(skimming,$ID("METABOOKALLGLOSSES"))) 
                setMode("allglosses");
            else if (getParent(skimming,$ID("METABOOKSTATICTOC"))) 
                setMode("statictoc");
            else if (getParent(skimming,$ID("METABOOKSEARCHRESULTS"))) 
                setMode("searchresults");
            else {}}
        metaBook.stopSkimming=stopSkimming;
        
        var rAF=fdjtDOM.requestAnimationFrame;

        function metaBookSkimTo(card,dir,hudup){
            var skimmer=$ID("METABOOKSKIMMER");
            var skimpoint=mB.skimpoint;
            var slice=getSlice(card);
            if (!(slice)) {
                fdjtLog.warn("Can't determine slice for skimming to %o",card);
                return;}
            var cardinfo=slice.getInfo(card);
            if (!(cardinfo)) {
                fdjtLog.warn("No info for skimming to %s in %s",card,slice);
                return;}
            else card=cardinfo.dom||card;
            if ((slice.mode)&&(mB.mode!==slice.mode))
                setMode(slice.mode);
            var passage=mbID(cardinfo.passage||cardinfo.id);
            if (typeof dir !== "number") dir=0;
            if (hasParent(card,mB.DOM.allglosses))
                metaBook.skimming=mB.slices.allglosses;
            else if (hasParent(card,$ID("METABOOKSEARCHRESULTS")))
                metaBook.skimming=mB.slices.searchresults;
            else if (hasParent(card,$ID("METABOOKSTATICTOC")))
                metaBook.skimming=mB.slices.statictoc;
            else mB.skimming=true;
            if ((Trace.mode)||(Trace.skimming))
                fdjtLog("metaBookSkim() %o (card=%o) mode=%o scn=%o/%o dir=%o",
                        passage,card,
                        mB.mode,mB.skimpoint,
                        mB.target,
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
                metaBook.skimpoint=card;}
            else {}
            skimMode(slice);
            if (typeof hudup !== 'undefined')
                setHUD(hudup,false);
            mB.GoTo(passage,"Skim");
            setSkimTarget(passage);
            highlightSkimTarget(passage,card);}
        metaBook.SkimTo=function(card,dir){
            rAF(function(){metaBookSkimTo(card,dir);});};
        metaBook.SkimTo=metaBookSkimTo;

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
            if (mB.target)
                mB.clearHighlights(mB.getDups(mB.target));
            mB.setTarget(passage);}
        function highlightSkimTarget(passage,card){
            var highlights=[];
            if ((card)&&(hasClass(card,"gloss"))) {
                var glossinfo=mB.glossdb.ref(card.name);
                if (glossinfo.excerpt) {
                    var searching=mB.getDups(passage.id);
                    var range=mB.findExcerpt(
                        searching,glossinfo.excerpt,glossinfo.exoff);
                    if (range) {
                        highlights=
                            fdjtUI.Highlight(range,"mbhighlightexcerpt");
                        addClass("METABOOKSKIMMER","mbfoundhighlights");}}
                else if (card.about[0]==="#")
                    addClass(mB.getDups(card.about.slice(1)),
                             "mbhighlightpassage");
                else addClass(mB.getDups(card.about),
                              "mbhighlightpassage");}
            else if ((card)&&(getParent(card,".searchslice"))) {
                var about=card.about, target=mbID(about);
                if (target) {
                    var info=mB.docinfo[target.id];
                    var terms=mB.query.tags;
                    var spellings=info.knodeterms;
                    var i=0, lim=terms.length;
                    if (lim===0)
                        addClass(mB.getDups(target),
                                 "mbhighlightpassage");
                    else while (i<lim) {
                        var term=terms[i++];
                        var h=mB.highlightTerm(term,target,info,spellings);
                        highlights=highlights.concat(h);}}}
            else {}}

        function getSlice(card){
            var cur_slice=mB.slices[mB.mode];
            if ((cur_slice)&&(cur_slice.getInfo(card)))
                return cur_slice;
            else if (card.nodeType) {
                if (hasParent(card,mB.DOM.allglosses))
                    return mB.slices.allglosses;
                else if (hasParent(card,$ID("METABOOKSEARCHRESULTS")))
                    return mB.searchresults;
                else return false;}
            else if (typeof card === "string") {
                if (mB.glossdb.probe(card))
                    return mB.slices.allglosses;
                else if (mB.docinfo[card])
                    return mB.slices.statictoc;
                else return false;}
            else return false;}
        metaBook.getSlice=getSlice;

        metaBook.addConfig("uisize",function(name,value){
            fdjtDOM.swapClass(
                mB.Frame,/metabookuifont\w+/g,"metabookuifont"+value);
            fdjt.Async(function(){mB.resizeUI();});
            fdjt.Async(function(){
                mB.updateSettings(name,value);});});
        metaBook.addConfig("dyslexical",function(name,value){
            var root=document.documentElement||document.body;
            if ((value)&&(typeof value === 'string')&&
                (/yes|on|t/i.exec(value))) {
                if (hasClass(root,"_DYSLEXICAL")) return;
                else {
                    metaBook.dyslexical=true;
                    addClass(root,"_DYSLEXICAL");}}
            else if (!(hasClass(root,"_DYSLEXICAL")))
                return;
            else {
                metaBook.dyslexical=false;
                fdjtDOM.dropClass(root,"_DYSLEXICAL");}
            fdjt.Async(function(){
                mB.resizeUI();
                if (mB.layout) mB.Paginate("typechange");},
                       10);});
        metaBook.addConfig("animatecontent",function(name,value){
            if (mB.dontanimate) {}
            else if (value) addClass(document.body,"_ANIMATE");
            else dropClass(document.body,"_ANIMATE");
            fdjt.Async(function(){
                mB.updateSettings(name,value);});});
        metaBook.addConfig("animatehud",function(name,value){
            if (mB.dontanimate) {}
            else if (value) addClass("METABOOKFRAME","_ANIMATE");
            else dropClass("METABOOKFRAME","_ANIMATE");
            fdjt.Async(function(){
                mB.updateSettings(name,value);});});

        /* Settings apply/save handlers */

        function keyboardHelp(arg,force){
            if (arg===true) {
                if (mB.keyboardHelp.timer) {
                    clearTimeout(mB.keyboardHelp.timer);
                    mB.keyboardHelp.timer=false;}
                dropClass("METABOOKKEYBOARDHELPBOX","closing");
                dropClass("METABOOKKEYBOARDHELPBOX","closed");
                return;}
            else if (arg===false) {
                if (mB.keyboardHelp.timer) {
                    clearTimeout(mB.keyboardHelp.timer);
                    mB.keyboardHelp.timer=false;}
                addClass("METABOOKKEYBOARDHELPBOX","closed");
                dropClass("METABOOKKEYBOARDHELPBOX","closing");
                return;}
            if ((!force)&&(!(mB.keyboardhelp))) return;
            if (typeof arg === 'string') arg=$ID(arg);
            if ((!(arg))||(!(arg.nodeType))) return;
            var box=$ID("METABOOKKEYBOARDHELPBOX");
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
            if (!(mB.glossdb.ref(uuid))) return false;
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
                        mB.SkimTo(src);
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
