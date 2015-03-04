/* -*- Mode: Javascript; Character-encoding: utf-8; -*- */

/* ###################### metabook/nav.js ###################### */

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
    var fdjtDOM=fdjt.DOM, fdjtString=fdjt.String, fdjtState=fdjt.State;
    var fdjtLog=fdjt.Log, fdjtUI=fdjt.UI;
    var dropClass=fdjtDOM.dropClass, addClass=fdjtDOM.addClass;
    var hasClass=fdjtDOM.hasClass, hasParent=fdjtDOM.hasParent;
    var mB=metaBook, mbID=mB.ID, getHead=mB.getHead, getTarget=mB.getTarget;
    var Trace=metaBook.Trace;
    var getDups, saveState, setHistory;

    function init_local(){
        getDups=metaBook.getDups;
        saveState=metaBook.saveState;
        setHistory=metaBook.setHistory;}
    metaBook.inits.push(init_local);

    /* Navigation functions */

    function setHead(head){
        if (!(head)) return;
        else if (typeof head === "string") 
            head=getHead(mbID(head))||metaBook.content;
        else {}
        var headid=head.codexbaseid||head.id;
        var headinfo=metaBook.docinfo[headid];
        while ((headinfo)&&(!(headinfo.level))) {
            headinfo=headinfo.head;
            headid=headinfo.frag;
            head=mbID(headid);}
        if (Trace.nav)
            fdjtLog("metaBook.setHead #%s",headid);
        if (head===metaBook.head) {
            if (Trace.target) fdjtLog("Redundant SetHead");
            return;}
        else if (headinfo) {
            if (Trace.target)
                metaBook.trace("metaBook.setHead",head);
            metaBook.TOC.setHead(headinfo);
            window.title=headinfo.title+" ("+document.title+")";
            if (metaBook.head) dropClass(metaBook.head,"sbookhead");
            addClass(head,"sbookhead");
            metaBook.setLocation(metaBook.location);
            metaBook.head=mbID(headid);
            metaBook.TOC.setHead(headinfo);}
        else {
            if (Trace.target)
                metaBook.trace("metaBook.setFalseHead",head);
            metaBook.TOC.setHead(headinfo);
            metaBook.head=false;}}
    metaBook.setHead=setHead;

    function setLocation(location,force){
        if ((!(force)) && (metaBook.location===location)) return;
        if (Trace.toc)
            fdjtLog("Setting location to %o",location);
        var info=metaBook.Info(metaBook.head);
        while (info) {
            var tocelt=document.getElementById("METABOOKTOC4"+info.frag);
            var statictocelt=document.getElementById("METABOOKSTATICTOC4"+info.frag);
            var hinfo=info.head, hhlen=((hinfo)&&(hinfo.ends_at-hinfo.starts_at));
            var start=info.starts_at; var end=info.ends_at;
            var progress=((location-start)*100)/hhlen;
            var bar=false, appbar=false;
            if (tocelt) {
                // tocelt.title=Math.round(progress)+"%";
                bar=fdjtDOM.getFirstChild(tocelt,".progressbar");}
            if (statictocelt) {
                appbar=fdjtDOM.getFirstChild(statictocelt,".progressbar");}
            if (Trace.toc)
                fdjtLog("For tocbar %o/%o loc=%o start=%o end=%o progress=%o",
                        bar,appbar,location,start,end,progress);
            if ((progress>=0) && (progress<=100)) {
                if (bar) bar.style.width=(progress)+"%";
                if (appbar) appbar.style.width=(progress)+"%";}
            info=info.head;}
        var spanbars=fdjtDOM.$(".spanbar");
        var i=0; while (i<spanbars.length) {
            var spanbar=spanbars[i++];
            var width=spanbar.ends-spanbar.starts;
            var ratio=(location-spanbar.starts)/width;
            if (Trace.toc)
                fdjtLog("ratio for spanbar %o[%d] is %o [%o,%o,%o]",
                        spanbar,spanbar.childNodes[0].childNodes.length,
                        ratio,spanbar.starts,location,spanbar.ends);
            if ((ratio>=0) && (ratio<=1)) {
                var progressbox=fdjtDOM.$(".progressbox",spanbar);
                if (progressbox.length>0) {
                    progressbox=progressbox[0];
                    progressbox.style.left=((Math.round(ratio*10000))/100)+"%";}}}
        metaBook.location=location;}
    metaBook.setLocation=setLocation;

    function location2pct(location) {
        var max_loc=metaBook.ends_at;
        var pct=(100*location)/max_loc;
        if (pct>100) pct=100;
        // This is (very roughly) intended to be the precision needed
        //  for line level (40 character) accuracy.
        var prec=Math.round(Math.log(max_loc/40)/Math.log(10))-2;
        if (prec<0) prec=0;
        if (Math.floor(pct)===pct)
            return Math.floor(pct)+"%";
        else return fdjtString.precString(pct,prec)+"%";}
    metaBook.location2pct=location2pct;

    function setTarget(target){
        if (Trace.target) metaBook.trace("metaBook.setTarget",target);
        if (target===metaBook.target) return;
        else if ((metaBook.target)&&
                 (metaBook.target.id===target.codexbaseid))
            return;
        if (metaBook.target) {
            var old_target=metaBook.target, oldid=old_target.id;
            var old_targets=getDups(oldid);
            dropClass(old_target,"mbtarget");
            dropClass(old_target,"mbnewtarget");
            dropClass(old_targets,"mbtarget");
            dropClass(old_targets,"mbnewtarget");
            if (!(hasParent(old_target,target)))
                clearHighlights(old_targets);
            metaBook.target=false;}
        if (!(target)) {
            if (metaBook.UI.setTarget) metaBook.UI.setTarget(false);
            return;}
        else if ((inUI(target))||(!(target.id||target.codexbaseid)))
            return;
        else {}
        var targetid=target.codexbaseid||target.id;
        var primary=((targetid)&&(mbID(targetid)))||target;
        var targets=getDups(targetid);
        addClass(target,"mbtarget");
        addClass(target,"mbnewtarget");
        addClass(targets,"mbtarget");
        addClass(targets,"mbnewtarget");
        setTimeout(function(){
            dropClass(target,"mbnewtarget");
            dropClass(targets,"mbnewtarget");},
                   3000);
        fdjtState.setCookie(
            "mbtarget",targetid||target.getAttribute('data-sbookid'));
        metaBook.target=primary;
        if (metaBook.UI.setTarget) metaBook.UI.setTarget(primary);
        if (metaBook.empty_cloud)
            metaBook.setCloudCuesFromTarget(metaBook.empty_cloud,primary);}
    metaBook.setTarget=setTarget;

    function clearHighlights(target){
        if (typeof target === "string") target=mbID(target);
        if (!(target)) return;
        else if (target.length) {
            dropClass(target,"mbhighlightpassage");
            var i=0, lim=target.length;
            while (i<lim) {
                var node=target[i++];
                fdjtUI.Highlight.clear(node,"mbhighlightexcerpt");
                fdjtUI.Highlight.clear(node,"mbhighlightsearch");}}
        else {
            dropClass(target,"mbhighlightpassage");
            fdjtUI.Highlight.clear(target,"mbhighlightexcerpt");
            fdjtUI.Highlight.clear(target,"mbhighlightsearch");}}
    metaBook.clearHighlights=clearHighlights;

    function findExcerpt(node,excerpt,off){
        if (typeof node === "string") node=mbID(node);
        if (!(node)) return false;
        if (node.nodeType) node=getDups(node);
        var trimmed=fdjtString.trim(excerpt);
        var before=((trimmed.search(/[.,"']/)===0)?("(^|\\s)"):("\\b"));
        var after=((trimmed.search(/[.,"']$/)>0)?("($|\\s)"):("\\b"));
        var pattern=fdjtDOM.textRegExp(trimmed,before,after);
        var matches=fdjtDOM.findMatches(node,pattern,off||0,1);
        if ((matches)&&(matches.length)) return matches[0];
        // We could do this more intelligently
        var result=false, roff=-1;
        matches=fdjtDOM.findMatches(node,pattern,0,1);
        while (matches.length>0) {
            var first=matches[0];
            if (first.start_offset>off) {
                if (roff<0) return result;
                else if ((off-roff)<(result.start_offset-off))
                    return result;
                else return first;}
            else {result=first; roff=first.start_offset;}
            matches=fdjtDOM.findMatches(
                node,pattern,first.endOffset+1,1);}
        if ((matches)&&(matches.length)) return matches[0];
        else return result;}
    metaBook.findExcerpt=findExcerpt;

    /* Navigation */

    var sbookUIclasses=
        /(\bhud\b)|(\bglossmark\b)|(\bleading\b)|(\bmetabookmargin\b)/;

    function inUI(elt){
        if (elt.metabookui) return true;
        else if (hasParent(elt,metaBook.HUD)) return true;
        else while (elt)
            if (elt.metabookui) return true;
        else if (hasClass(elt,sbookUIclasses)) return true;
        else elt=elt.parentNode;
        return false;}
    metaBook.inUI=inUI;

    function setHashID(target){
        var targetid=target.codexbaseid||target.id;
        if ((!(targetid))||(window.location.hash===targetid)||
            ((window.location.hash[0]==='#')&&
             (window.location.hash.slice(1)===targetid)))
            return;
        if ((target===metaBook.body)||(target===document.body)) return;
        if (targetid) window.location.hash=targetid;}
    metaBook.setHashID=setHashID;

    function getLocInfo(elt){
        var eltid=false;
        var counter=0; var lim=200;
        var forward=fdjtDOM.forward;
        while ((elt)&&(counter<lim)) {
            eltid=elt.codexbaseid||elt.id;
            if ((eltid)&&(metaBook.docinfo[eltid])) break;
            else {counter++; elt=forward(elt);}}
        if ((eltid)&&(metaBook.docinfo[eltid])) {
            var info=metaBook.docinfo[eltid];
            return {start: info.starts_at,end: info.ends_at,
                    len: info.ends_at-info.starts_at};}
        else return false;
    } metaBook.getLocInfo=getLocInfo;

    function resolveLocation(loc){
        var allinfo=metaBook.docinfo._allinfo;
        var i=0; var lim=allinfo.length;
        while (i<lim) {
            if (allinfo[i].starts_at<loc) i++;
            else break;}
        while (i<lim)  {
            if (allinfo[i].starts_at>loc) break;
            else i++;}
        return mbID(allinfo[i-1].frag);
    } metaBook.resolveLocation=resolveLocation;

    // This moves within the document in a persistent way
    function metabookGoTo(arg,caller,istarget,savestate,skiphist){
        if (typeof istarget === 'undefined') istarget=true;
        if (typeof savestate === 'undefined') savestate=true;
        var target, location, locinfo;
        if (savestate) metaBook.clearStateDialog();
        if (!(arg)) {
            fdjtLog.warn("falsy arg (%s) to metabookGoTo from %s",arg,caller);
            return;}
        if (typeof arg === 'string') {
            target=mbID(arg);
            locinfo=getLocInfo(target);
            location=locinfo.start;}
        else if (typeof arg === 'number') {
            location=arg;
            target=((istarget)&&
                    (((istarget.nodeType)&&(istarget.id))?(istarget):
                     (resolveLocation(arg))));}
        else if ((arg.target)&&((arg.location)||(arg.offset))) {
            target=getTarget(arg.target);
            if (arg.location) 
                location=arg.location;
            else {
                locinfo=getLocInfo(arg.target);
                location=locinfo.start+arg.offset;}}
        else if (arg.nodeType) {
            target=getTarget(arg);
            locinfo=getLocInfo(arg);
            location=locinfo.start;}
        else {
            fdjtLog.warn("Bad metabookGoTo %o",arg);
            return;}
        if ((istarget)&&(istarget.nodeType)) target=istarget;
        else if ((typeof istarget === "string")&&(mbID(istarget)))
            target=mbID(istarget);
        else {}
        var info=(target)&&
            metaBook.docinfo[target.getAttribute("data-baseid")||target.id];
        if ((location)&&(info.ends_at)&&(info.starts_at)&&
            ((location>(info.ends_at))||(location<(info.starts_at))))
            // Why does this happen???
            location=false;
        var page=((metaBook.bypage)&&(metaBook.layout)&&
                  (metaBook.getPage(target,location)));
        var pageno=(page)&&(parseInt(page.getAttribute("data-pagenum"),10));
        if (!(target)) {
            if (metaBook.layout instanceof fdjt.CodexLayout)
                metaBook.GoToPage(arg,caller,savestate);
            else if (arg.nodeType) {
                var scan=arg;
                while (scan) {
                    if (scan.offsetTop) break;
                    else scan=scan.parentNode;}
                if (scan) metaBook.content.style.offsetTop=-(scan.offsetTop);}
            else {}
            if (metaBook.curpage)
                saveState({location: metaBook.location,
                           page: metaBook.curpage,
                           npages: metaBook.pagecount},
                          true);
            else saveState({location: metaBook.location},true);
            return;}
        var targetid=target.codexbaseid||target.id;
        if (Trace.nav)
            fdjtLog("metaBook.GoTo%s() #%o@P%o/L%o %o",
                    ((caller)?("/"+caller):""),targetid,pageno,
                    ((info)&&(info.starts_at)),target);
        if (info) {
            metaBook.point=target;
            if (!((metaBook.hudup)||(metaBook.mode))) metaBook.skimpoint=false;}
        setHead(target);
        setLocation(location);
        if ((istarget)&&(targetid)&&(!(inUI(target)))) setTarget(target);
        if ((savestate)&&(istarget))
            metaBook.saveState({
                target: (target.getAttribute("data-baseid")||target.id),
                location: location,page: pageno,npages: metaBook.pagecount},
                               skiphist);
        else if (savestate)
            metaBook.saveState({location: location,page: pageno,
                                npages: metaBook.pagecount},
                               skiphist);
        else if (skiphist) {}
        else if (istarget)
            setHistory({
                target: (target.getAttribute("data-baseid")||target.id),
                location: location,page: pageno,npages: metaBook.pagecount});
        else setHistory({
            target: (target.getAttribute("data-baseid")||target.id),
            location: location,page: pageno,npages: metaBook.pagecount});
        if (page)
            metaBook.GoToPage(page,caller||"metabookGoTo",false,true);
        else {
            if (metaBook.previewing)
                metaBook.stopPreview(((caller)?("goto/"+caller):("goto")),target);
            var offinfo=fdjtDOM.getGeometry(target,metaBook.content);
            var use_top=offinfo.top-((fdjtDOM.viewHeight()-50)/2);
            if (use_top<0) use_top=0;
            window.scrollTo(0,use_top);}
        if (metaBook.clearGlossmark) metaBook.clearGlossmark();
        if (metaBook.mode==="addgloss") metaBook.setMode(false,false);
        metaBook.location=location;
    } metaBook.GoTo=metabookGoTo;

    function anchorFn(evt){
        var target=fdjtUI.T(evt);
        while (target)
            if (target.href) break; else target=target.parentNode;
        if ((target)&&(target.href)&&(target.href[0]==='#')) {
            var elt=mbID(target.href.slice(1));
            if (elt) {metaBook.GoTo(elt,"anchorFn"); fdjtUI.cancel(evt);}}}
    metaBook.anchorFn=anchorFn;

    // This jumps and disables the HUD at the same time
    function metaBookJumpTo(target){
        if (metaBook.hudup) metaBook.setMode(false);
        metaBook.GoTo(target,"JumpTo");}
    metaBook.JumpTo=metaBookJumpTo;

    function getTOCHead(id){
        var elts=fdjtDOM.$("#METABOOKSTATICTOC div.head[NAME='SBR"+id+"']");
        return ((elts)&&(elts.length===1)&&(elts[0]));}

    // This jumps and disables the HUD at the same time
    function metaBookGoTOC(target){
        if (target) metaBook.GoTo(target,"GoTOC");
        metaBook.setMode("statictoc");
        var headid=((metaBook.head)&&(metaBook.head.id));
        var headinfo=(headid)&&(metaBook.docinfo[headid]);
        var hhid=(headinfo)&&(headinfo.head)&&(headinfo.head.frag);
        var tocelt=(headid)&&getTOCHead(headid);
        var cxtelt=(hhid)&&getTOCHead(hhid);
        if ((cxtelt)&&(tocelt)) {
            cxtelt.scrollIntoView();
            if (fdjtDOM.isVisible(tocelt)) return;
            else tocelt.scrollIntoView();}
        else if (tocelt)
            tocelt.scrollIntoView();
        else if (cxtelt)
            cxtelt.scrollIntoView();
        else {}}
    metaBook.GoTOC=metaBookGoTOC;

    // This jumps and disables the HUD at the same time
    // We try to animate the transition
    function metaBookSkimTo(target){
        if (metaBook.hudup) { // Figure out what mode to go to
            var headinfo=metaBook.docinfo[target]||metaBook.docinfo[target.id];
            if ((headinfo)&&((!(headinfo.sub))||(headinfo.sub.length===0))) {
                metaBook.setMode("statictoc"); metaBook.setHUD(false,false);
                addClass(document.body,"mbSKIMMING");}}
        metaBook.GoTo(target,"metaBookSkimTo");}
    metaBook.Skimto=metaBookSkimTo;


})();

/* Emacs local variables
   ;;;  Local variables: ***
   ;;;  compile-command: "cd ..; make" ***
   ;;;  indent-tabs-mode: nil ***
   ;;;  End: ***
*/
