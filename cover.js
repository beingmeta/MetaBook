/* -*- Mode: Javascript; Character-encoding: utf-8; -*- */

/* ###################### metabook/cover.js ###################### */

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

(function(){
    "use strict";
    var fdjtDOM=fdjt.DOM, fdjtLog=fdjt.Log, fdjtString=fdjt.String;
    var fdjtUI=fdjt.UI, fdjtTime=fdjt.Time, $ID=fdjt.ID;
    var dropClass=fdjtDOM.dropClass, addClass=fdjtDOM.addClass;
    var hasClass=fdjtDOM.hasClass, hasParent=fdjtDOM.hasParent;
    var getChildren=fdjtDOM.getChildren;
    
    var mB=metaBook, Trace=mB.Trace;
    var fixStaticRefs=metaBook.fixStaticRefs;

    var IScroll=window.IScroll;

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

    function setupScroller(div){
        var c=fdjtDOM("div");
        var children=div.childNodes; var cnodes=[];
        var i=0, lim=children.length; while (i<lim)
            cnodes.push(children[i++]);
        i=0; while (i<lim) c.appendChild(cnodes[i++]);
        div.appendChild(c);
        return new IScroll(div);}

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
        else if ((coverpage=$ID("SBOOKCOVERPAGE"))) {
            coverpage=coverpage.cloneNode(true);
            coverpage.removeAttribute("style");
            fdjtDOM.stripIDs(coverpage);
            coverpage.id="METABOOKCOVERPAGE";}
        else if (metaBook.coverimage) {
            var coverimage=fdjtDOM.Image(metaBook.covermage);
            coverpage=fdjtDOM("div#METABOOKCOVERPAGE",coverimage);}
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
        var titlepage=$ID("METABOOKTITLEPAGE");
        if ((titlepage)&&(hasAnyContent(titlepage))) {
            titlepage=titlepage.cloneNode(true);
            titlepage.removeAttribute("style");
            titlepage.id="METABOOKTITLEPAGE";}
        else {
            titlepage=$ID("SBOOKSTITLEPAGE")||
                $ID("SBOOKTITLEPAGE")||
                $ID("TITLEPAGE");
            if (titlepage) {
                titlepage=titlepage.cloneNode(true);
                fdjtDOM.dropClass(
                    titlepage,/\b(codex|metabook)[A-Za-z0-9]+\b/);
                fdjtDOM.addClass(titlepage,"sbooktitlepage");
                fdjtDOM.stripIDs(titlepage);
                titlepage.setAttribute("style","");
                titlepage.id="METABOOKTITLEPAGE";}
            else {
                var info=metaBook.getBookInfo();
                titlepage=fdjtDOM(
                    "div#METABOOKTITLEPAGE.sbooktitlepage",
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

        var creditspage=$ID("METABOOKCREDITSPAGE");
        if (creditspage)
            creditspage=creditspage.cloneNode(true);
        else {
            creditspage=$ID("SBOOKSCREDITSPAGE")||$ID("CREDITSPAGE");
            if (creditspage) {
                creditspage=creditspage.cloneNode(true);
                fdjtDOM.stripIDs(creditspage);
                creditspage.removeAttribute("style");}}
        if ((creditspage)&&(hasAnyContent(creditspage))) {
            var curcredits=cover.getElementById("METABOOKCREDITSPAGE");
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
            var about_book=$ID("SBOOKABOUTPAGE")||
                $ID("SBOOKABOUTBOOK")||
                $ID("SBOOKSABOUTPAGE")||
                $ID("SBOOKSABOUTBOOK");
            var about_author=$ID("SBOOKABOUTAUTHOR")||
                $ID("SBOOKABOUTORIGIN")||
                $ID("SBOOKAUTHORPAGE")||
                $ID("SBOOKSAUTHORPAGE")||
                $ID("SBOOKABOUTAUTHORS")||
                $ID("SBOOKSABOUTAUTHORS")||
                $ID("SBOOKSABOUTAUTHOR");
            if ((about_book)||(about_author)) {
                blurb=fdjtDOM(
                    "div#METABOOKBLURB.metabookblurb.scrolling",
                    "\n",about_book,"\n",about_author,"\n");}
            else blurb=false;}
        if (blurb) addToCover(cover,blurb);
        
        var settings=fdjtDOM(
            "div#METABOOKSETTINGS.scrolling");
        settings.innerHTML=fixStaticRefs(metaBook.HTML.settings);
        metaBook.DOM.settings=settings;
        if (settings) addToCover(cover,settings);
        
        var cover_help=fdjtDOM(
            "div#METABOOKAPPHELP.metabookhelp.scrolling");
        cover_help.innerHTML=fixStaticRefs(metaBook.HTML.help);
        if (cover_help) addToCover(cover,cover_help);
        
        var console=metaBook.DOM.console=
            fdjtDOM("div#METABOOKCONSOLE.metabookconsole.scrolling");
        if (Trace.startup>2) fdjtLog("Setting up console %o",console);
        console.innerHTML=fixStaticRefs(metaBook.HTML.console);
        metaBook.DOM.input_console=input_console=
            fdjtDOM.getChild(console,"TEXTAREA");
        metaBook.DOM.input_button=input_button=
            fdjtDOM.getChild(console,"span.button");
        input_button.onclick=consolebutton_click;
        input_console.onkeypress=consoleinput_keypress;
        if (console) addToCover(cover,console);
        
        var layers=fdjtDOM("div#METABOOKLAYERS");
        var sbooksapp=fdjtDOM("iframe#SBOOKSAPP");
        sbooksapp.setAttribute("frameborder",0);
        sbooksapp.setAttribute("scrolling","auto");
        layers.appendChild(sbooksapp);
        metaBook.DOM.sbooksapp=sbooksapp;
        if (layers) addToCover(cover,layers);
        
        var cc=getChildren(cover,"#METABOOKCOVERCONTROLS");
        if (cc) {
            if (!(coverpage)) addClass(cc,"nobookcover");
            if (!(creditspage)) addClass(cc,"nocredits");
            if (!(blurb)) addClass(cc,"noblurb");}
        
        if (metaBook.touch)
            fdjtDOM.addListener(cover,"touchstart",cover_clicked);
        else fdjtDOM.addListener(cover,"click",cover_clicked);
        
        if (metaBook.iscroll) {
            if (blurb) metaBook.scrollers.about=setupScroller(blurb);
            metaBook.scrollers.help=setupScroller(cover_help);
            metaBook.scrollers.console=setupScroller(console);
            metaBook.scrollers.settings=setupScroller(settings);}
        
        stripExplicitStyles(cover);

        if ((existing_cover)&&(existing_cover.parentNode===frame))
            frame.replaceChild(cover,existing_cover);
        else {
            frame.appendChild(cover); 
            if (existing_cover)
                existing_cover.parentNode.removeChild(existing_cover);}
        
        metaBook.showCover();
        
        // Make the cover hidden by default
        metaBook.CSS.hidecover=fdjtDOM.addCSSRule(
            "#METABOOKCOVER","opacity: 0.0; z-index: -10; pointer-events: none; height: 0px; width: 0px;");
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
        var covertitle=$ID("METABOOKTITLEPAGE");
        if ((covertitle)&&
            (!(hasClass(covertitle,/\b(adjustfont|fdjtadjustfont)\b/))))
            fdjtDOM.adjustFontSize(covertitle);
        if (restore) {
            style.zIndex=''; style.display='';
            style.opacity=''; style.visibility='';
            framestyle.display='';}}
    metaBook.resizeCover=resizeCover;

    var coverids={"coverpage": "METABOOKCOVERPAGE",
                  "titlepage": "METABOOKTITLEPAGE",
                  "creditspage": "METABOOKCREDITSPAGE",
                  "blurb": "METABOOKBLURB",
                  "help": "METABOOKAPPHELP",
                  "settings": "METABOOKSETTINGS",
                  "layers": "METABOOKLAYERS"};

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
            (!($ID("SBOOKSAPP").src))&&
            (!(metaBook.appinit)))
            metaBook.initIFrameApp();

        var curclass=cover.className;
        var cur=((curclass)&&(coverids[curclass])&&
                 ($ID(coverids[curclass])));
        var nxt=((mode)&&(coverids[mode])&&($ID(coverids[mode])));
        if ((cur)&&(nxt)) {
            cur.style.display='block';
            nxt.style.display='block';
            setTimeout(function(){
                cur.style.display="";
                nxt.style.display="";},
                       3000);}
        setTimeout(function(){
            if (Trace.mode)
                fdjtLog("On %o, switching cover mode to %s from %s",
                        evt,mode,curclass);
            if (mode==="console") fdjtLog.update();
            cover.className=mode;
            metaBook.mode=mode;},
                   20);
        fdjt.UI.cancel(evt);
        return false;}

    metaBook.addConfig("showconsole",function(name,value){
        var root=document.documentElement||document.body;
        if (value) addClass(root,"_SHOWCONSOLE");
        else dropClass(root,"_SHOWCONSOLE");
        var controls=$ID("METABOOKCOVERCONTROLS");
        fdjtDOM.adjustFontSize(controls);
        fdjt.Async(function(){metaBook.updateSettings(name,value);});});

}());

/* Emacs local variables
   ;;;  Local variables: ***
   ;;;  compile-command: "cd ..; make" ***
   ;;;  indent-tabs-mode: nil ***
   ;;;  End: ***
*/
