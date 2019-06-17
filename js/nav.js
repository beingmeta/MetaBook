/* -*- Mode: Javascript; Character-encoding: utf-8; -*- */

/* ###################### metareader/nav.js ###################### */

/* Copyright (C) 2009-2017 beingmeta, inc.
   This file implements a Javascript/DHTML web application for reading
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

(function(){
    "use strict";
    var fdjtDOM=fdjt.DOM, fdjtString=fdjt.String, fdjtState=fdjt.State;
    var fdjtLog=fdjt.Log, fdjtUI=fdjt.UI;
    var dropClass=fdjtDOM.dropClass, addClass=fdjtDOM.addClass;
    var hasClass=fdjtDOM.hasClass, hasParent=fdjtDOM.hasParent;
    var mR=metaReader, mbID=mR.ID, getHead=mR.getHead, getTarget=mR.getTarget;
    var Trace=metaReader.Trace;
    var getDups, saveState, setHistory;

    function init_local(){
        getDups=metaReader.getDups;
        saveState=metaReader.saveState;
        setHistory=metaReader.setHistory;}
    metaReader.inits.local.push(init_local);

    /* Navigation functions */

    function setHead(arg){
        var head;
        if (!(arg)) return;
        else if (typeof arg === "string") 
            head=getHead(mbID(head))||metaReader.content;
        else head=arg;
        var headid=head.codexbaseid||head.id;
        var headinfo=(mR.docinfo)&&(mR.docinfo[headid]);
        while ((headinfo)&&(!(headinfo.level))) {
            headinfo=headinfo.head;
            headid=headinfo.frag;
            head=mbID(headid);}
        if ((Trace.nav>1)&&(headinfo))
            fdjtLog("metaReader.setHead #%s %o from %o info=%o:\n%j",
                    (headid||"none"),head,arg,headinfo,headinfo);
        else if (Trace.nav)
            fdjtLog("metaReader.setHead #%s %o from %o",
                    (headid||"none"),head,arg);

        if (head===metaReader.head) {
            if (Trace.target) fdjtLog("Redundant SetHead");
            return;}
        else if (headinfo) {
            if (Trace.target)
                metaReader.trace("metaReader.setHead",head);
            window.title=headinfo.title+" ("+document.title+")";
            if (metaReader.head) dropClass(metaReader.head,"bookhead");
            addClass(head,"bookhead");
            metaReader.setLocation(metaReader.location);
            metaReader.head=mbID(headid);
            metaReader.TOC.setHead(headinfo);}
        else {
            if (Trace.target)
                metaReader.trace("metaReader.setFalseHead",head);
            metaReader.TOC.setHead(false);
            metaReader.head=false;}}
    metaReader.setHead=setHead;

    function setLocation(location,force){
        if ((!(force)) && (metaReader.location===location)) return;
        if (Trace.toc)
            fdjtLog("Setting location to %o",location);
        var info=metaReader.Info(metaReader.head);
        while (info) {
            var tocelt=document.getElementById("MBTOC4"+info.frag);
            var hinfo=info.head;
            var hhlen=((hinfo)&&(hinfo.ends_at-hinfo.starts_at));
            var start=info.starts_at; var end=info.ends_at;
            var progress=((location-start)*100)/hhlen;
            var bar=false, appbar=false;
            if (tocelt) {
                // tocelt.title=Math.round(progress)+"%";
                bar=fdjtDOM.getFirstChild(tocelt,".mbtoc_posbar");}
            if (Trace.toc)
                fdjtLog("For tocbar %o/%o loc=%o start=%o end=%o progress=%o",
                        bar,appbar,location,start,end,progress);
            if ((progress>=0) && (progress<=100)) {
                if (bar) bar.style.width=(progress)+"%";
                if (appbar) appbar.style.width=(progress)+"%";}
            info=info.head;}
        metaReader.location=location;}
    metaReader.setLocation=setLocation;

    function location2pct(location,loclen) {
        if (!(loclen)) loclen=metaReader.ends_at;
        var pct=(100*location)/loclen;
        if (pct>100) pct=100;
        // This is (very roughly) intended to be the precision needed
        //  for line level (40 character) accuracy.
        var prec=Math.round(Math.log(loclen/40)/Math.log(10))-2;
        if (prec<0) prec=0;
        if (Math.floor(pct)===pct)
            return Math.floor(pct)+"%";
        else return fdjtString.precString(pct,prec)+"%";}
    metaReader.location2pct=location2pct;

    function setTarget(target){
        if (Trace.target) metaReader.trace("metaReader.setTarget",target);
        if (target===metaReader.target) return;
        else if ((metaReader.target)&&
                 (metaReader.target.id===target.codexbaseid))
            return;
        if (metaReader.target) {
            var old_target=metaReader.target, oldid=old_target.id;
            var old_targets=getDups(oldid);
            dropClass(old_target,"mbtarget");
            dropClass(old_target,"mbnewtarget");
            dropClass(old_targets,"mbtarget");
            dropClass(old_targets,"mbnewtarget");
            if (!(hasParent(old_target,target)))
                clearHighlights(old_targets);
            metaReader.target=false;}
        if (!(target)) {
            if (metaReader.UI.setTarget) metaReader.UI.setTarget(false);
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
            "MB:TARGET",targetid||target.getAttribute('data-bookid'),
            false,false,(location.href.search('https:')===0));
        metaReader.target=primary;
        if (metaReader.UI.setTarget) metaReader.UI.setTarget(primary);
        if ((mR.docinfo)&&(metaReader.empty_cloud))
            metaReader.setCloudCuesFromTarget(metaReader.empty_cloud,primary);}
    metaReader.setTarget=setTarget;

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
    metaReader.clearHighlights=clearHighlights;

    function findExcerpt(node,excerpt,off){
        if (typeof node === "string") node=mbID(node);
        if (!(node)) return false;
        if (node.nodeType) node=getDups(node);
        var trimmed=fdjtString.trim(excerpt);
        var before=((trimmed.search(/[.,"']/)===0)?("(^|\\s)"):("\\b"));
        var after=((trimmed.search(/[.,"']$/)>0)?("($|\\s)"):("\\b"));
        var pattern=fdjtDOM.textRegExp(trimmed,false,true,before,after);
        var matches=fdjtDOM.findMatches(node,pattern,off||0,1);
        if ((!(matches))||(matches.length===0)) {
            pattern=fdjtDOM.textRegExp(trimmed,true,true,before,after);
            matches=fdjtDOM.findMatches(node,pattern,off||0,1);}
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
    metaReader.findExcerpt=findExcerpt;

    /* Navigation */

    var sbookUIclasses=/(\bhud\b)|(\bglossmark\b)|(\bleading\b)/;

    function inUI(elt){
        if (elt.metareaderui) return true;
        else if (hasParent(elt,metaReader.HUD)) return true;
        else while (elt)
            if (elt.metareaderui) return true;
        else if (hasClass(elt,sbookUIclasses)) return true;
        else elt=elt.parentNode;
        return false;}
    metaReader.inUI=inUI;

    function setHashID(target){
        var targetid=target.codexbaseid||target.id;
        if ((!(targetid))||(window.location.hash===targetid)||
            ((window.location.hash[0]==='#')&&
             (window.location.hash.slice(1)===targetid)))
            return;
        if ((target===metaReader.body)||(target===document.body)) return;
        if (targetid) window.location.hash=targetid;}
    metaReader.setHashID=setHashID;

    function getLocInfo(elt){
        var eltid=false;
        var counter=0; var lim=200;
        var forward=fdjtDOM.forward;
        while ((elt)&&(counter<lim)) {
            eltid=elt.codexbaseid||elt.id;
            if ((eltid)&&(metaReader.docinfo[eltid])) break;
            else {counter++; elt=forward(elt);}}
        if ((eltid)&&(metaReader.docinfo[eltid])) {
            var info=metaReader.docinfo[eltid];
            return {start: info.starts_at,end: info.ends_at,
                    len: info.ends_at-info.starts_at};}
        else return false;
    } metaReader.getLocInfo=getLocInfo;

    function resolveLocation(loc){
        var allinfo=metaReader.docinfo._allinfo;
        var i=0; var lim=allinfo.length;
        while (i<lim) {
            if (allinfo[i].starts_at<loc) i++;
            else break;}
        while (i<lim)  {
            if (allinfo[i].starts_at>loc) break;
            else i++;}
        return mbID(allinfo[i-1].frag);
    } metaReader.resolveLocation=resolveLocation;

    // This moves within the document in a persistent way
    function metareaderGoTo(arg,caller,istarget,savestate,skiphist,forgetcur){
        if (typeof istarget === 'undefined') istarget=true;
        if (typeof savestate === 'undefined') savestate=true;
        var target, location, locinfo;
        if (savestate) metaReader.clearStateDialog();
        if ((!(arg))&&(arg!==0)) {
            fdjtLog.warn("falsy arg (%s) to metareaderGoTo from %s",arg,caller);
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
            fdjtLog.warn("Bad metareaderGoTo %o",arg);
            return;}
        // Save the current state
        if ((mR.state)&&(!(forgetcur))) setHistory(mR.state);
        if ((istarget)&&(istarget.nodeType)) target=istarget;
        else if ((typeof istarget === "string")&&(mbID(istarget)))
            target=mbID(istarget);
        else {}
        var info=(target)&&(mR.docinfo)&&
            mR.docinfo[target.getAttribute("data-baseid")||target.id];
        if ((location)&&(info)&&(info.ends_at)&&(info.starts_at)&&
            ((location>(info.ends_at))||(location<(info.starts_at))))
            // Don't use the location if it's not in the node
            location=false;
        var page=((metaReader.bypage)&&(metaReader.layout)&&
                  (metaReader.getPage(target,location)));
        var pageno=(page)&&(parseInt(page.getAttribute("data-pagenum"),10));
        var targetid=(target)&&(target.codexbaseid||target.id);
        if (mR.Trace.nav)
            fdjtLog("mR.GoTo(%s%s%s%s%s) %o location=%o page=%o pageno=%d arg=%o",
                    caller||"",((caller)?(":"):("")),((istarget)?("t"):("")),
                    ((savestate)?("s"):("")),((!(skiphist))?("h"):("")),
                    target,((location)?(location):("none")),page,pageno,arg);
        if (!(target)) {
            if (mR.bypage) {
                if ((page)&&(metaReader.layout instanceof fdjt.Codex)) 
                    metaReader.GoToPage(page||arg,caller,savestate);}
            else if (arg.nodeType) {
                var scan=arg;
                while (scan) {
                    if (scan.offsetTop) break;
                    else scan=scan.parentNode;}
                if (scan) metaReader.content.style.offsetTop=-(scan.offsetTop);}
            else {}
            if (metaReader.curpage)
                saveState({location: metaReader.location,
                           page: metaReader.curpage,
                           npages: metaReader.pagecount},
                          true);
            else saveState({location: metaReader.location},true);
            return;}
        if (Trace.nav)
            fdjtLog("metaReader.GoTo%s() #%o@P%o/L%o %o",
                    ((caller)?("/"+caller):""),targetid,pageno,
                    ((info)&&(info.starts_at)),target);
        if (info) {
            metaReader.point=target;
            if (!((metaReader.hudup)||(metaReader.mode))) metaReader.skimpoint=false;}
        if ((target)&&(mR.docinfo)) setHead(target);
        if (location) setLocation(location);
        if ((istarget)&&(targetid)&&(!(inUI(target)))) setTarget(target);
        if ((savestate)&&(istarget)&&(target))
            metaReader.saveState({
                target: (target.getAttribute("data-baseid")||target.id),
                location: location,page: pageno,npages: metaReader.pagecount},
                               skiphist);
        else if (savestate)
            metaReader.saveState({location: location,page: pageno,
                                npages: metaReader.pagecount},
                               skiphist);
        else {}
        if (skiphist) {}
        else if (istarget)
            setHistory({
                target: (target.getAttribute("data-baseid")||target.id),
                location: location,page: pageno,npages: metaReader.pagecount});
        else if (target) 
            setHistory({
                target: (target.getAttribute("data-baseid")||target.id),
                location: location,page: pageno,npages: metaReader.pagecount});
        else {}
        if (page)
            metaReader.GoToPage(page,caller||"metareaderGoTo",false,true);
        else {
            if (metaReader.previewing)
                metaReader.stopPreview(((caller)?("goto/"+caller):("goto")),target);
            var offinfo=fdjtDOM.getGeometry(target,metaReader.content);
            var use_top=offinfo.top-((fdjtDOM.viewHeight()-50)/2);
            if (use_top<0) use_top=0;
            window.scrollTo(0,use_top);}
        if (metaReader.clearGlossmark) metaReader.clearGlossmark();
        metaReader.location=location;
    } metaReader.GoTo=metareaderGoTo;

    function anchorFn(evt){
        var target=fdjtUI.T(evt);
        while (target)
            if (target.href) break; else target=target.parentNode;
        if ((target)&&(target.href)&&(target.href[0]==='#')) {
            var elt=mbID(target.href.slice(1));
            if (elt) {
                metaReader.GoTo(elt,"anchorFn"); 
                fdjtUI.cancel(evt);}}}
    metaReader.anchorFn=anchorFn;

    // This jumps and disables the HUD at the same time
    function metaReaderJumpTo(target){
        if (metaReader.hudup) metaReader.setMode(false);
        metaReader.GoTo(target,"JumpTo");}
    metaReader.JumpTo=metaReaderJumpTo;

    // This jumps and disables the HUD at the same time
    function metaReaderGoTOC(target){
        if (target) metaReader.GoTo(target,"GoTOC");}
    metaReader.GoTOC=metaReaderGoTOC;

})();

/* Emacs local variables
   ;;;  Local variables: ***
   ;;;  compile-command: "cd ..; make" ***
   ;;;  indent-tabs-mode: nil ***
   ;;;  End: ***
*/
