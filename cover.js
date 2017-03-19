/* -*- Mode: Javascript; Character-encoding: utf-8; -*- */

/* ###################### metabook/cover.js ###################### */

/* Copyright (C) 2009-2015 beingmeta, inc.
   This file implements a Javascript/DHTML web application for reading
   large structured documents (metaBooks).

   For more information on metabooks, visit www.bookhub.io
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

(function(){
    "use strict";
    var fdjtDOM=fdjt.DOM, fdjtLog=fdjt.Log, fdjtString=fdjt.String;
    var fdjtUI=fdjt.UI, fdjtTime=fdjt.Time, $ID=fdjt.ID;
    var dropClass=fdjtDOM.dropClass, addClass=fdjtDOM.addClass;
    var hasClass=fdjtDOM.hasClass, hasParent=fdjtDOM.hasParent;
    var getChildren=fdjtDOM.getChildren;
    
    var mB=metaBook, Trace=mB.Trace;
    var fixStaticRefs=metaBook.fixStaticRefs;

    var hasContent=fdjtDOM.hasContent;
    
    function hasAnyContent(n){return hasContent(n,true);}


    // Console input and evaluation
    // These are used by the input handlers of the console log
    var input_console=false, input_button=false;
    
    /* Console methods */
    function console_eval(){
        /* jshint evil: true */
        fdjtLog("Executing %s",input_console.value);
        var result=eval(input_console.value);
        var string_result=
            ((result.nodeType)?
             (fdjtString("%o",result)):
             (fdjtString("%j",result)));
        fdjtLog("Result is %s",string_result);}
    function consolebutton_click(evt){
        if (Trace.gesture>1) fdjtLog("consolebutton_click %o",evt);
        console_eval();}
    function consoleinput_keypress(evt){
        evt=evt||window.event;
        if (evt.keyCode===13) {
            if (!(evt.ctrlKey)) {
                fdjtUI.cancel(evt);
                console_eval();
                if (evt.shiftKey) input_console.value="";}}}

    function stripExplicitStyles(root){
        if ((root.id)&&(root.id.search("METABOOK")===0))
            root.removeAttribute("style");
        if (root.childNodes) {
            var children=root.childNodes;
            var i=0, lim=children.length;
            while (i<lim) {
                var child=children[i++];
                if (child.nodeType===1) stripExplicitStyles(child);}}}

    // Cover setup
    function setupCover(){
        var frame=$ID("METABOOKFRAME"), started=fdjtTime();
        var cover=fdjtDOM("div#METABOOKCOVER.metabookcover");
        var existing_cover=$ID("METABOOKCOVER");
        if (Trace.startup>2) fdjtLog("Setting up cover");
        if (!(frame)) {
            frame=fdjtDOM("div#METABOOKFRAME");
            fdjtDOM.prepend(document.body,frame);}
        metaBook.Frame=frame;
        metaBook.cover=cover;
        cover.innerHTML=fixStaticRefs(metaBook.HTML.cover);
        
        var coverpage=$ID("METABOOKCOVERPAGE");
        if (coverpage) {
            if (!(hasAnyContent(coverpage))) {
                coverpage.removeAttribute("style");
                coverpage=false;}}
        else if (metaBook.coverimage) {
            var coverimage=fdjtDOM.Image(metaBook.coverimage);
            coverimage.id="METABOOKCOVERIMAGE";
            coverpage=fdjtDOM("div.flap#METABOOKCOVERPAGE",coverimage);}
        else coverpage=false;
        if (coverpage) {
            cover.setAttribute("data-defaultclass","coverpage");
            addClass(cover,"coverpage");
            addToCover(cover,coverpage);}
        else {
            var controls=fdjt.DOM.getChild(cover,"#METABOOKCOVERCONTROLS");
            cover.setAttribute("data-defaultclass","titlepage");
            addClass(cover,"titlepage");
            addClass(controls,"nocoverpage");}
        var titlepage=$ID("METABOOKTITLE");
        if ((titlepage)&&(hasAnyContent(titlepage))) {
            titlepage=titlepage.cloneNode(true);
            titlepage.removeAttribute("style");
            titlepage.id="METABOOKTITLE";}
        else {
            var mb_titlepage=$ID("METABOOKTITLEPAGE");
            var other_titlepage= $ID("PUBTOOLTITLEPAGE") ||
                $ID("TITLEPAGE");
            if ( (mb_titlepage) && (other_titlepage) )
                titlepage=mb_titlepage;
            else if (mb_titlepage)
                titlepage=mb_titlepage.cloneNode(true);
            else if (other_titlepage)
                titlepage=other_titlepage.cloneNode(true);
            else titlepage=false;
            if (titlepage) {
                fdjtDOM.dropClass(
                    titlepage,/\b(codex|pubtool)[A-Za-z0-9]+\b/);
                fdjtDOM.addClass(titlepage,"metabooktitlepage");
                fdjtDOM.stripIDs(titlepage);
                titlepage.setAttribute("style","");
                fdjtDOM.addClass(titlepage,"flap");
                titlepage.id="METABOOKTITLE";}
            else {
                var info=metaBook.getBookInfo();
                titlepage=fdjtDOM(
                    "div#METABOOKTITLE.flap",
                    fdjtDOM("DIV.title",info.title),
                    fdjtDOM("DIV.credits",
                            ((info.byline)?(fdjtDOM("DIV.byline",info.byline)):
                             ((info.authors)&&(info.authors.length))?
                             (fdjtDOM("DIV.author",info.authors[0])):
                             (false))),
                    fdjtDOM("DIV.pubinfo",
                            ((info.publisher)&&
                             (fdjtDOM("P",info.publisher)))));}}
        if (titlepage) addToCover(cover,titlepage);

        var creditspage=$ID("METABOOKCREDITS");
        if (creditspage)
            creditspage=creditspage.cloneNode(true);
        else {
            creditspage=$ID("METABOOKCREDITS")||$ID("PUBTOOLCREDITSPAGE")||$ID("CREDITSPAGE");
            if (creditspage) {
                creditspage=creditspage.cloneNode(true);
                fdjtDOM.stripIDs(creditspage);
                creditspage.removeAttribute("style");}}
        if ((creditspage)&&(hasAnyContent(creditspage))) {
            var curcredits=cover.getElementById("METABOOKCREDITS");
            if (curcredits)
                curcredits.parentNode.replaceChild(creditspage,curcredits);
            else cover.appendChild(creditspage);}
        else creditspage=false;
        if (creditspage) addToCover(cover,creditspage);
        
        var blurb=$ID("METABOOKBLURB")||$ID("METABOOKABOUTPAGE");
        if ((blurb)&&(hasAnyContent(blurb))) {
            blurb=blurb.cloneNode(true);
            blurb.id="METABOOKBLURB";
            blurb.removeAttribute("style");}
        else {
            var about_book=$ID("METABOOKABOUTPAGE")||
                $ID("METABOOKABOUTBOOK")||
                $ID("PUBTOOLABOUTBOOK");
            var about_author=$ID("METABOOKABOUTAUTHOR")||
                $ID("PUBTOOLABOUTAUTHOR");
            if ((about_book)||(about_author)) {
                blurb=fdjtDOM(
                    "div#METABOOKBLURB.flap.metabookblurb.scrolling",
                    "\n",about_book,"\n",about_author,"\n");}
            else blurb=false;}
        if (blurb) addToCover(cover,blurb);
        
        var settings=fdjtDOM(
            "div#METABOOKSETTINGS.flap.scrolling");
        settings.innerHTML=fixStaticRefs(metaBook.HTML.settings);
        metaBook.DOM.settings=settings;
        if (settings) addToCover(cover,settings);
        
        var cover_help=fdjtDOM(
            "div#METABOOKAPPHELP.flap.metabookhelp.scrolling");
        cover_help.innerHTML=fixStaticRefs(metaBook.HTML.help);
        if (cover_help) addToCover(cover,cover_help);
        
        var console=metaBook.DOM.console=
            fdjtDOM("div#METABOOKCONSOLE.flap.metabookconsole.scrolling");
        if (Trace.startup>2) fdjtLog("Setting up console %o",console);
        console.innerHTML=fixStaticRefs(metaBook.HTML.console);
        metaBook.DOM.input_console=input_console=
            fdjtDOM.getChild(console,"TEXTAREA");
        metaBook.DOM.input_button=input_button=
            fdjtDOM.getChild(console,"span.button");
        input_button.onclick=consolebutton_click;
        input_console.onkeypress=consoleinput_keypress;
        if (console) addToCover(cover,console);
        
        var layers=fdjtDOM("div#METABOOKLAYERS.flap");
        var bkhapp=fdjtDOM("iframe#BOOKHUBAPP");
        bkhapp.setAttribute("frameborder",0);
        bkhapp.setAttribute("scrolling","auto");
        layers.appendChild(bkhapp);
        metaBook.DOM.bkhapp=bkhapp;
        if (layers) addToCover(cover,layers);
        
        var cc=getChildren(cover,"#METABOOKCOVERCONTROLS");
        if (cc) {
            if (!(coverpage)) addClass(cc,"nobookcover");
            if (!(creditspage)) addClass(cc,"nocredits");
            if (!(blurb)) addClass(cc,"noblurb");}
        
        if (metaBook.touch)
            fdjtDOM.addListener(cover,"touchstart",cover_clicked);
        else fdjtDOM.addListener(cover,"click",cover_clicked);
        
        stripExplicitStyles(cover);

        if ((existing_cover)&&(existing_cover.parentNode===frame))
            frame.replaceChild(cover,existing_cover);
        else {
            frame.appendChild(cover);
            if (existing_cover)
                existing_cover.parentNode.removeChild(existing_cover);}
        
        if (mB.docid) {
            var docid=mB.docid;
            var catlink=$ID("METABOOKCATALOGLINK");
            if (catlink) {
                var slash=docid.indexOf('/');
                if (slash>0)
                    catlink.href="https://catalog.bookhub.io/T"+
                    docid.slice(slash+1)+"/";}}

        var hidden_refuri=fdjt.ID("BHLOGIN_REFURI");
        var hidden_docid=fdjt.ID("BHLOGIN_DOCID");
        var hidden_origin=fdjt.ID("BHLOGIN_ORIGIN");
        if ((hidden_refuri)&&(mB.refuri)) hidden_refuri.value=mB.refuri;
        if ((hidden_docid)&&(mB.docid)) hidden_docid.value=mB.docid;
        if (hidden_origin) hidden_origin.value=location.origin;

        metaBook.showCover();
        
        if (Trace.startup>1)
            fdjtLog("Cover setup done in %dms",fdjtTime()-started);
        return cover;}
    metaBook.setupCover=setupCover;

    var toArray=fdjtDOM.toArray;
    function addToCover(cover,item){
        var children=toArray(cover.childNodes);
        var i=0, lim=children.length; while (i<lim) {
            var child=children[i++];
            if ((child.nodeType===1)&&
                ((child.id===item.id)||(child.id===(item.id+"HOLDER")))) {
                cover.replaceChild(item,child);
                return;}}
        cover.appendChild(item);}

    function resizeCover(cover){
        if (!(cover)) cover=$ID("METABOOKCOVER");
        if (!(cover)) return;
        var frame=$ID("METABOOKFRAME");
        var style=cover.style, framestyle=frame.style;
        var restore=0;
        if (!(cover.offsetHeight)) {
            restore=1; style.zIndex=-500; style.visibility='hidden';
            style.opacity=0; style.display='block';
            style.height='100%'; style.width='100%';
            framestyle.display='block';}
        var controls=$ID("METABOOKCOVERCONTROLS");
        var userbox=$ID("METABOOKUSERBOX");
        fdjtDOM.adjustFontSize(controls);
        fdjtDOM.adjustFontSize(userbox);
        // fdjt.DOM.resetFontSize(controls);
        // fdjt.DOM.resetFontSize(userbox);            
        var covertitle=$ID("METABOOKTITLE");
        if ((covertitle)&&
            (!(hasClass(covertitle,/\b(adjustfont|fdjtadjustfont)\b/))))
            fdjtDOM.adjustFontSize(covertitle);
        if (restore) {
            style.zIndex=''; style.display='';
            style.opacity=''; style.visibility='';
            framestyle.display='';}}
    metaBook.resizeCover=resizeCover;

    /*
    var coverids={"coverpage": "METABOOKCOVERPAGE",
                  "titlepage": "METABOOKTITLE",
                  "creditspage": "METABOOKCREDITS",
                  "blurb": "METABOOKBLURB",
                  "help": "METABOOKAPPHELP",
                  "settings": "METABOOKSETTINGS",
                  "layers": "METABOOKLAYERS"};
    */

    function cover_clicked(evt){
        var target=fdjtUI.T(evt);
        var cover=$ID("METABOOKCOVER");
        if (metaBook.statedialog) {
            fdjt.Dialog.close(metaBook.statedialog);
            metaBook.statedialog=false;}
        if (fdjt.UI.isClickable(target)) return;
        if (hasParent(target,$ID("METABOOKCOVERCONTROLS")))
            return controls_clicked(evt,target,cover);
        else if (hasParent(target,".scrolling")) {}
        else {
            metaBook.clearStateDialog();
            metaBook.hideCover();
            fdjtUI.cancel(evt);
            return;}}
        
    function controls_clicked(evt,target,cover){
        var scan=target;
        while (scan) {
            if (scan===document.body) break;
            else if (scan.getAttribute("data-mode")) break;
            else scan=scan.parentNode;}
        var mode=scan.getAttribute("data-mode");
        if ((mode==="layers")&&
            (!($ID("BOOKHUBAPP").src))&&
            (!(metaBook.appinit)))
            metaBook.initIFrameApp();
        /*
        var curclass=cover.className;
        var cur=((curclass)&&(coverids[curclass])&&
                 ($ID(coverids[curclass])));
        var nxt=((mode)&&(coverids[mode])&&($ID(coverids[mode])));
        */
        if (mode==="console") fdjtLog.update();
        cover.className=mode;
        metaBook.mode=mode;
        fdjt.UI.cancel(evt);
        return false;}

    metaBook.addConfig("showconsole",function(name,value){
        var root=document.documentElement||document.body;
        if (value) addClass(root,"_SHOWCONSOLE");
        else dropClass(root,"_SHOWCONSOLE");
        var controls=$ID("METABOOKCOVERCONTROLS");
        if (controls) fdjtDOM.adjustFontSize(controls);
        fdjt.Async(function(){metaBook.updateSettings(name,value);});});

}());

/* Emacs local variables
   ;;;  Local variables: ***
   ;;;  compile-command: "cd ..; make" ***
   ;;;  indent-tabs-mode: nil ***
   ;;;  End: ***
*/
