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

        var fixStaticRefs=metaBook.fixStaticRefs;

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
            hud.innerHTML=fixStaticRefs(metaBook.HTML.hud);
            hud.metabookui=true;
            fdjtDOM.append(messages);
            if ($ID("METABOOKFRAME")) frame=$ID("METABOOKFRAME");
            else {
                frame=fdjtDOM("div#METABOOKFRAME");
                fdjtDOM.prepend(document.body,frame);}
            addClass(frame,"metabookframe");
            addClass(frame,"tapholdcontext");
            frame.appendChild(messages); frame.appendChild(hud);
            if (metaBook.getConfig("uisize"))
                addClass(frame,"metabookuifont"+metaBook.getConfig("uisize"));
            metaBook.Frame=frame;
            // Fill in the HUD help
            var hudhelp=$ID("METABOOKHUDHELP");
            hudhelp.innerHTML=fixStaticRefs(metaBook.HTML.hudhelp);
            // Fill in the HUD help
            var helptext=$ID("METABOOKAPPHELP");
            helptext.innerHTML=fixStaticRefs(metaBook.HTML.help);
            // Setup heart
            var heart=$ID("METABOOKHEARTBODY");
            heart.innerHTML=fixStaticRefs(metaBook.HTML.heart);
            metaBook.DOM.heart=heart;
            var gloss_attach=$ID("METABOOKGLOSSATTACH");
            gloss_attach.innerHTML=fixStaticRefs(metaBook.HTML.attach);
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
            search.innerHTML=fixStaticRefs(metaBook.HTML.searchbox);
            addClass(metaBook.HUD,"emptysearch");

            // Setup addgloss prototype
            var addgloss=$ID("METABOOKADDGLOSSPROTOTYPE");
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
            metaBook.DOM.allglosses=$ID("METABOOKALLGLOSSES");
            if ((Trace.startup>2)&&(metaBook.DOM.allglosses))
                fdjtLog("Setting up gloss UI %o",allglosses);

            metaBook.slices.allglosses=allglosses=
                new metaBook.Slice(metaBook.DOM.allglosses);
            metaBook.slices.allglosses.mode="allglosses";
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
                if (origin.search(/https:\/\/[^\/]+.(metabooks|sbooks).net/)!==0) {
                    fdjtLog.warn("Rejecting insecure message from %s",
                                 origin);
                    return;}
                if (evt.data==="sbooksapp") {
                    setMode("sbooksapp");}
                else if (evt.data==="metabooksapp") {
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
                    {override: true,holdfast: true,
                     taptapmsecs: 0,holdmsecs: 150,
                     minswipe:0});
            metaBook.TapHold.head=
                new TapHold(metaBook.DOM.head,
                            {override: true,taptapmsecs: 0,
                             holdmsecs: 200});
            metaBook.DOM.skimmer=$ID("METABOOKSKIMMER");
            metaBook.TapHold.skimmer=
                new TapHold(metaBook.DOM.skimmer,{taptapmsecs: 300});
            
            metaBook.DOM.sources=$ID("METABOOKSOURCES");
            metaBook.TapHold.sources=
                new TapHold(metaBook.DOM.sources,{taptapmsecs: 300});

            var help=metaBook.DOM.help=$ID("METABOOKHELP");
            help.innerHTML=fixStaticRefs(metaBook.HTML.help);

            /* Setup clouds */
            var dom_gloss_cloud=$ID("METABOOKGLOSSCLOUD");
            metaBook.gloss_cloud=
                new fdjtUI.Completions(
                    dom_gloss_cloud,$ID("METABOOKADDTAGINPUT"),
                    fdjtUI.FDJT_COMPLETE_OPTIONS|
                        fdjtUI.FDJT_COMPLETE_CLOUD|
                        fdjtUI.FDJT_COMPLETE_ANYWORD);
            metaBook.TapHold.gloss_cloud=new TapHold(metaBook.gloss_cloud.dom);

            metaBook.empty_cloud=
                new fdjtUI.Completions(
                    $ID("METABOOKALLTAGS"),false,
                    fdjtUI.FDJT_COMPLETE_OPTIONS|
                        fdjtUI.FDJT_COMPLETE_CLOUD|
                        fdjtUI.FDJT_COMPLETE_ANYWORD);
            if (metaBook.adjustCloudFont)
                metaBook.empty_cloud.updated=function(){
                    metaBook.adjustCloudFont(this);};
            metaBook.DOM.empty_cloud=$ID("METABOOKALLTAGS");
            metaBook.TapHold.empty_cloud=new TapHold(metaBook.empty_cloud.dom);
            
            var dom_share_cloud=$ID("METABOOKSHARECLOUD");
            metaBook.share_cloud=
                new fdjtUI.Completions(
                    dom_share_cloud,$ID("METABOOKADDSHAREINPUT"),
                    fdjtUI.FDJT_COMPLETE_OPTIONS|
                        fdjtUI.FDJT_COMPLETE_CLOUD|
                        fdjtUI.FDJT_COMPLETE_ANYWORD);
            metaBook.DOM.share_cloud=dom_share_cloud;
            metaBook.TapHold.share_cloud=new TapHold(metaBook.share_cloud.dom);

            fdjtDOM.setupCustomInputs($ID("METABOOKHUD"));

            if (Trace.startup>1)
                fdjtLog("Initialized basic HUD in %dms",fdjtTime()-started);}
        metaBook.initHUD=initHUD;
        
        function resizeHUD(){
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
                        flag,metaBook.mode,metaBook.hudup,
                        document.body.className,
                        metaBookHUD.className);
            if (flag) {
                metaBook.hudup=true;
                dropClass(document.body,/\b(openhud|openglossmark)\b/g);
                addClass(document.body,"hudup");}
            else {
                metaBook.hudup=false;
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
                    addClass(document.body,"mbNOMODE");
                    metaBook.skimming=false;
                    metaBook.mode=false;}
                dropClass(document.body,"hudup");
                dropClass(document.body,"openhud");
                metaBook.focusBody();}}
        metaBook.setHUD=setHUD;

        /* Opening and closing the cover */

        function showCover(){
            if (metaBook._started)
                fdjtState.dropLocal("mB("+mB.docid+").opened");
            setHUD(false);
            metaBook.closed=true;
            if (metaBook.covermode) {
                addClass(metaBook.cover,metaBook.covermode);
                metaBook.mode=metaBook.covermode;}
            addClass(document.body,"mbCOVER");}
        metaBook.showCover=showCover;
        function hideCover(){
            if (metaBook._started)
                fdjtState.setLocal(
                    "mB("+mB.docid+").opened",fdjtTime());
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
        var metaBookCoverModes=/\b((welcome)|(help)|(layers)|(login)|(settings)|(cover)|(aboutsbooks)|(aboutmetabooks)|(console)|(aboutbook)|(titlepage))\b/g;
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
                (!($ID("BOOKHUBAPP").src))&&
                (!(metaBook.appinit)))
                metaBook.initIFrameApp();
            if ((metaBook.mode==="addgloss")&&(mode!=="addgloss")&&
                (hasClass("METABOOKLIVEGLOSS","modified")))
                metaBook.submitGloss($ID("METABOOKLIVEGLOSS"));
            if (mode) dropClass(document.body,"mbNOMODE");
            else addClass(document.body,"mbNOMODE");
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
                             (fdjtDOM.$1(mode_focus)):($ID(mode_focus)));
                        mode_input.blur();}
                    dropClass(metaBookHUD,metaBookModes);
                    metaBook.mode=false;
                    metaBook.last_mode=true;}
                else if (typeof mode !== 'string') 
                    throw new Error('mode arg not a string');
                else if (mode.search(metaBookCoverModes)>=0) {
                    if (mode!==metaBook.mode) {
                        $ID("METABOOKCOVER").className=mode;
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
                             (fdjtDOM.$1(mode_focus)):($ID(mode_focus)));
                        mode_input.blur();}
                    if (mode!==metaBook.mode) metaBook.last_mode=metaBook.mode;
                    metaBook.mode=mode;}
                // If we're switching to the inner app but the iframe
                //  hasn't been initialized, we do it now.
                if ((mode==="sbooksapp")&&
                    (!($ID("BOOKHUBAPP").src))&&
                    (!(metaBook.appinit)))
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
                    ($ID("METABOOKOPENGLOSSMARK"))) {
                    $ID("METABOOKOPENGLOSSMARK").id="";
                    dropClass(document.body,"openglossmark");}
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

            if ((mode!=="openglossmark")&&
                (metaBook.mode==="openglossmark")) {
                if ($ID("METABOOKOPENGLOSSMARK"))
                    $ID("METABOOKOPENGLOSSMARK").id="";
                dropClass(document.body,"openglossmark");}
            
            if (mode==="statictoc") {
                var headinfo=((metaBook.head)&&(metaBook.head.id)&&
                              (metaBook.docinfo[metaBook.head.id]));
                var static_head=$ID("MBTOC4"+headinfo.frag);
                var toc=fdjt.ID("METABOOKSTATICTOC");
                if (hasClass(toc,"mbsyncslice")) {
                    fdjt.showPage.check(toc);
                    if (static_head.offsetHeight===0)
                        fdjt.showPage.showNode(toc,static_head);}}
            else if (mB.slices[mode]) {
                var curloc=metaBook.location;
                var slice=mB.slices[mode];
                var slicediv=slice.container;
                slice.setLive(true);
                if (hasClass(slicediv,"mbsyncslice"))
                    slice.setLocation(curloc);}
            else if (metaBook.pagers[mode])
                fdjt.showPage.check(metaBook.pagers[mode]);
            else {}
            
            // We autofocus any input element appropriate to the mode
            if (metabook_mode_foci[mode]) {
                var mode_focus=metabook_mode_foci[metaBook.mode];
                var mode_input=
                    (((mode_focus.search(/[.#]/))>=0)?
                     (fdjtDOM.$1(mode_focus)):($ID(mode_focus)));
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
            
            if (mB.slices[mode]) mB.slices[mode].setLive(true);

            if (display_sync) metaBook.displaySync();}

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

            var app=$ID("BOOKHUBAPP");
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
            if (!(metaBook.skimming)) return;
            dropClass(document.body,"mbSKIMMING");
            metaBook.skimming=false;
            if (getParent(skimming,$ID("METABOOKALLGLOSSES"))) 
                metaBook.setMode("allglosses");
            else if (getParent(skimming,$ID("METABOOKSTATICTOC"))) 
                metaBook.setMode("statictoc");
            else if (getParent(skimming,$ID("METABOOKSEARCHRESULTS"))) 
                metaBook.setMode("searchresults");
            else {}}
        metaBook.stopSkimming=stopSkimming;
        
        var rAF=fdjtDOM.requestAnimationFrame;

        function metaBookSkimTo(card,dir){
            var skimmer=$ID("METABOOKSKIMMER");
            var skimpoint=metaBook.skimpoint;
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
                mB.setMode(slice.mode);
            var passage=mbID(cardinfo.passage||cardinfo.id);
            if (typeof dir !== "number") dir=0;
            if (hasParent(card,metaBook.DOM.allglosses))
                metaBook.skimming=metaBook.slices.allglosses;
            else if (hasParent(card,$ID("METABOOKSEARCHRESULTS")))
                metaBook.skimming=mB.slices.searchresults;
            else if (hasParent(card,$ID("METABOOKSTATICTOC")))
                metaBook.skimming=metaBook.slices.statictoc;
            else metaBook.skimming=true;
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
                    skimmer.style[fdjtDOM.transform]="translate(0,-110%)";
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
            metaBook.GoTo(passage,"Skim");
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
            if (metaBook.target)
                metaBook.clearHighlights(metaBook.getDups(metaBook.target));
            metaBook.setTarget(passage);}
        function highlightSkimTarget(passage,card){
            var highlights=[];
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
                else addClass(metaBook.getDups(card.about),
                              "mbhighlightpassage");}
            else if ((card)&&(getParent(card,".searchslice"))) {
                var about=card.about, target=mbID(about);
                if (target) {
                    var info=metaBook.docinfo[target.id];
                    var terms=metaBook.query.tags;
                    var spellings=info.knodeterms;
                    var i=0, lim=terms.length;
                    if (lim===0)
                        addClass(metaBook.getDups(target),
                                 "mbhighlightpassage");
                    else while (i<lim) {
                        var term=terms[i++];
                        var h=metaBook.highlightTerm(term,target,info,spellings);
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

        metaBook.addConfig("uisize",function(name,value){
            fdjtDOM.swapClass(
                metaBook.Frame,/metabookuifont\w+/g,"metabookuifont"+value);
            fdjt.Async(function(){metaBook.resizeUI();});
            fdjt.Async(function(){
                metaBook.updateSettings(name,value);});});
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
