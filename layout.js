/* -*- Mode: Javascript; Character-encoding: utf-8; -*- */

/* ###################### metabook/layout.js ###################### */

/* Copyright (C) 2009-2014 beingmeta, inc.

   This file implements the layout component of metaBook, relying heavily
   on CodexLayout from the FDJT library.

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

/* Reporting progress, debugging */

/* Initialize these here, even though they should always be
   initialized before hand.  This will cause various code checkers to
   not generate unbound variable warnings when called on individual
   files. */
// var fdjt=((typeof fdjt !== "undefined")?(fdjt):({}));
// var metaBook=((typeof metaBook !== "undefined")?(metaBook):({}));
// var Knodule=((typeof Knodule !== "undefined")?(Knodule):({}));
// var iScroll=((typeof iScroll !== "undefined")?(iScroll):({}));

metaBook.Paginate=
    (function(){
        "use strict";

        var mB=metaBook;
        var fdjtString=fdjt.String;
        var fdjtState=fdjt.State;
        var fdjtHash=fdjt.Hash;
        var fdjtTime=fdjt.Time;
        var fdjtLog=fdjt.Log;
        var fdjtDOM=fdjt.DOM;
        var fdjtID=fdjt.ID;
        var mbID=metaBook.ID;
        var CodexLayout=fdjt.CodexLayout;

        var getGeometry=fdjtDOM.getGeometry;
        var getParent=fdjtDOM.getParent;
        var getChildren=fdjtDOM.getChildren;
        var hasClass=fdjtDOM.hasClass;
        var addClass=fdjtDOM.addClass;
        var dropClass=fdjtDOM.dropClass;
        var toArray=fdjtDOM.toArray;
        var textWidth=fdjtDOM.textWidth;
        var hasContent=fdjtDOM.hasContent;
        var isEmpty=fdjtString.isEmpty;
        var secs2short=fdjtTime.secs2short;
        
        var getLocal=fdjtState.getLocal;
        var setLocal=fdjtState.setLocal;

        var atoi=parseInt;

        function layoutMessage(string,pct){
            var pb=fdjtID("METABOOKLAYOUTMESSAGE");
            fdjt.UI.ProgressBar.setMessage(pb,string);
            if (typeof pct==="number")
                fdjt.UI.ProgressBar.setProgress(pb,pct);}

        /* Reporting progress, debugging */
        function layout_progress(info){
            var tracelevel=info.tracelevel;
            var started=info.started;
            var pagenum=info.pagenum;
            if (!(pagenum)) return;
            var now=fdjtTime();
            var howlong=secs2short((now-started)/1000);
            var indicator=fdjtID("METABOOKLAYOUTINDICATOR");
            if (info.done) {
                if (indicator)
                    indicator.style.width=Math.floor(pct)+"%";
                fdjtDOM.replace(
                    "METABOOKPAGENOTEXT",
                    fdjtDOM("div.metabookpageno#METABOOKPAGENOTEXT",
                            metaBook.curpage||"?",
                            "/",pagenum," (",Math.floor(pct),
                            "%)"));
                layoutMessage(fdjtString(
                    "Finished laying out %d %dx%d pages in %s",
                    pagenum,
                    secs2short((info.done-info.started)/1000)),
                              100);
                fdjtLog("Finished laying out %d %dx%d pages in %s",
                        pagenum,info.width,info.height,
                        secs2short((info.done-info.started)/1000));}
            else {
                if ((info.lastid)&&(metaBook.docinfo)&&
                    ((metaBook.docinfo[info.lastid]))) {
                    var docinfo=metaBook.docinfo;
                    var maxloc=docinfo._maxloc;
                    var lastloc=docinfo[info.lastid].starts_at;
                    var pct=(100*lastloc)/maxloc, fpct=Math.floor(pct);
                    if (indicator) indicator.style.width=fpct+"%";
                    fdjtDOM.replace(
                        "METABOOKPAGENOTEXT",
                        fdjtDOM("div.metabookpageno#METABOOKPAGENOTEXT",
                                metaBook.curpage||"?",
                                "/",pagenum," (",fpct,"%)"));
                    layoutMessage(fdjtString(
                        "Laid out %d %dx%d pages (%d%%)",
                        pagenum,info.width,info.height,fpct),
                                  pct);
                    if (tracelevel)
                        fdjtLog("Laid out %d %dx%d pages (%d%%) in %s",
                                pagenum,info.width,info.height,fpct,howlong);}
                else {
                    layoutMessage(fdjtString(
                        "Laid out %d %dx%d pages in %s",
                        info.pagenum,info.width,info.height,howlong));
                    if (tracelevel)
                        fdjtLog("Laid out %d pages in %s",
                                info.pagenum,howlong);}}}

        function Paginate(why,init){
            if (((metaBook.layout)&&(!(metaBook.layout.done)))) return;
            if (!(why)) why="because";
            layoutMessage("Preparing your book",0);
            dropClass(document.body,"_SCROLL");
            addClass(document.body,"mbLAYOUT");
            scaleLayout(false);
            var forced=((init)&&(init.forced));
            var geom=getGeometry(fdjtID("CODEXPAGE"),false,true);
            var height=geom.inner_height, width=geom.width;
            var justify=metaBook.justify;
            var spacing=metaBook.bodyspacing;
            var size=metaBook.bodysize||"normal";
            var family=metaBook.bodyfamily||"serif";
            if ((!(metaBook.layout))&&(mB.Trace.startup))
                fdjtLog("Page layout requires %dx%d %s %s pages",
                        width,height,size,family);
            if (metaBook.layout) {
                var current=metaBook.layout;
                if ((!(forced))&&
                    (width===current.width)&&
                    (height===current.height)&&
                    (size===current.bodysize)&&
                    (family===current.bodyfamily)&&
                    ((!(spacing))||(spacing===current.bodyspacing))&&
                    (((justify)&&(current.justify))||
                     ((!justify)&&(!current.justify)))) {
                    dropClass(document.body,"mbLAYOUT");
                    fdjtLog("Skipping redundant pagination for %s",
                            current.layout_id);
                    return;}
                // Repaginating, start with reversion
                metaBook.layout.Revert();
                metaBook.layout=false;}

            // Resize the content
            metaBook.sizeContent();

            // Create a new layout
            var layout_args=getLayoutArgs();
            var layout=new CodexLayout(layout_args);
            layout.bodysize=size; layout.bodyfamily=family;
            metaBook.layout=layout;
            
            var layout_id=layout.layout_id;

            function restore_layout(content,layout_id){
                fdjtLog("Using saved layout %s",layout_id);
                fdjtID("CODEXCONTENT").style.display='none';
                layoutMessage("Using cached layout",0);
                dropClass(document.body,"_SCROLL");
                addClass(document.body,"_BYPAGE");
                layout.restoreLayout(content,finish_layout);}
            function finish_layout(layout) {
                fdjtID("CODEXPAGE").style.visibility='';
                fdjtID("CODEXCONTENT").style.visibility='';
                dropClass(document.body,"mbLAYOUT");
                metaBook.layout=layout;
                metaBook.pagecount=layout.pages.length;
                if (mB.Trace.startup)
                    fdjtLog("Restored %d-page layout %s, adding glosses",
                            layout.pages.length,layout_id);
                var lostids=layout.lostids, moved_ids=lostids._all_ids;
                var i=0, lim=moved_ids.length;
                while (i<lim) {
                    var addGlossmark=metaBook.UI.addGlossmark;
                    var id=moved_ids[i++];
                    var glosses=metaBook.glossdb.find('frag',id);
                    if (!((glosses)&&(glosses.length))) continue;
                    var j=0, jlim=glosses.length; while (j<jlim) {
                        var gloss=metaBook.glossdb.probe(glosses[j++]);
                        if (gloss) {
                            var nodes=metaBook.getDups(gloss.frag);
                            addClass(nodes,"glossed");
                            var k=0, klim=nodes.length; while (k<klim) {
                                addGlossmark(nodes[k++],gloss);}}}}
                if (mB.Trace.startup)
                    fdjtLog("Finished adding glossmarks to saved layout");
                setupPagebar();
                if (metaBook.layoutdone) {
                    var fn=metaBook.layoutdone;
                    metaBook.layoutdone=false;
                    fn();}
                if (metaBook.state)
                    metaBook.restoreState(metaBook.state,"layoutRestored");
                metaBook.layout.running=false;

                return false;}
            
            var max_layouts=3;

            function recordLayout(layout_id,source_id){
                var key="metabook.layouts("+source_id+")";
                var saved=getLocal(key,true);
                if (!(saved)) setLocal(key,[layout_id],true);
                else {
                    var loc=saved.indexOf(layout_id);
                    // Place at end, removing current position if neccessary
                    if (loc>=0) saved.splice(loc,1);
                    saved.push(layout_id);
                    if (saved.length>max_layouts) {
                        var j=saved.length-max_layouts-1;
                        while (j>=0) {
                            fdjtLog("Dropping layout #%d %s",j,saved[j]);
                            CodexLayout.dropLayout(saved[j--]);}
                        saved=saved.slice(saved.length-max_layouts);}
                    setLocal(key,saved,true);}}

            function new_layout(){

                // Prepare to do the layout
                dropClass(document.body,"_SCROLL");
                addClass(document.body,"_BYPAGE");
                // This keeps the page content hidden during layout
                // fdjtID("CODEXPAGE").style.visibility='hidden';
                fdjtID("CODEXCONTENT").style.visibility='hidden';
                
                // Now make the content (temporarily) the same width as
                // the page
                var saved_width=metaBook.content.style.width;
                metaBook.content.style.width=getGeometry(metaBook.page).width+"px";
                
                // Now walk the content
                var content=metaBook.content;
                var nodes=toArray(content.childNodes);
                fdjtLog("Laying out %d root nodes into %dx%d pages (%s), id=%s",
                        nodes.length,layout.width,layout.height,
                        (why||""),layout_id);
                
                layoutMessage("Starting new layout",0);
                
                // Do the adjust font bit.  We rely on metaBook.content
                //  having the same width as metaBook.page
                fdjt.DOM.tweakFonts(content);
                
                // Now reset the width
                metaBook.content.style.width=saved_width;
                
                var i=0; var lim=nodes.length;
                function rootloop(){
                    if (i>=lim) {
                        layout.Finish();
                        layout_progress(layout);
                        if (metaBook.cache_layout_thresh) {
                            var elapsed=layout.done-layout.started;
                            if ((typeof metaBook.cache_layout_thresh === "number")?
                                (elapsed>metaBook.cache_layout_thresh):(elapsed>5000)) {
                                layout.saveLayout(function(l){
                                    recordLayout(l.layout_id,metaBook.sourceid);});}}
                        fdjtID("CODEXPAGE").style.visibility='';
                        fdjtID("CODEXCONTENT").style.visibility='';
                        dropClass(document.body,"mbLAYOUT");
                        metaBook.layout=layout;
                        metaBook.pagecount=layout.pages.length;
                        setupPagebar();
                        if (metaBook.layoutdone) {
                            var fn=metaBook.layoutdone;
                            metaBook.layoutdone=false;
                            fn();}
                        if (metaBook.state)
                            metaBook.restoreState(metaBook.state,"layoutDone");
                        metaBook.layout.running=false;
                        setTimeout(syncLayout,100);
                        return false;}
                    else {
                        var root=nodes[i++];
                        var timeslice=
                            ((layout.hasOwnProperty('timeslice'))?
                             (layout.timeslice):
                             (CodexLayout.timeslice||100));
                        var timeskip=
                            ((layout.hasOwnProperty('timeskip'))?
                             (layout.timeskip):
                             (CodexLayout.timeskip||50));
                        if (((root.nodeType===3)&&
                             (!(isEmpty(root.nodeValue))))||
                            ((root.nodeType===1)&&
                             (root.tagName!=='LINK')&&(root.tagName!=='META')&&
                             (root.tagName!=='SCRIPT')&&(root.tagName!=='BASE'))) 
                            layout.addContent(root,timeslice,timeskip,
                                              layout.tracelevel,
                                              layout_progress,rootloop);
                        else return rootloop();}}

      
                rootloop();}
            
            if ((metaBook.cache_layout_thresh)&&
                (!((metaBook.forcelayout)))&&
                (!(forced))) {
                if (mB.Trace.layout)
                    fdjtLog("Fetching layout %s",layout_id);
                CodexLayout.fetchLayout(layout_id,function(content){
                    if (content) {
                        if (mB.Trace.layout)
                            fdjtLog("Got layout %s",layout_id);
                        recordLayout(layout_id,metaBook.sourceid);
                        restore_layout(content,layout_id);}
                    else new_layout();});}
            else {
                setTimeout(new_layout,10);}}
        metaBook.Paginate=Paginate;

        CodexLayout.prototype.onresize=function(){
            if (metaBook.bypage) metaBook.Paginate("resize");
            else fdjt.DOM.tweakFonts(metaBook.content);};
        
        metaBook.addConfig(
            "layout",
            function(name,val){
                metaBook.page_style=val;
                if (val==='bypage') {
                    if (!(metaBook.docinfo)) {
                        // If there isn't any docinfo (during startup, for
                        // instance), don't bother actually paginating.
                        metaBook.bypage=true;}
                    else if (!(metaBook.bypage)) {
                        // set this
                        metaBook.bypage=true;
                        if (metaBook.postconfig)
                            // If we're in the middle of config,
                            // push off the work of paginating
                            metaBook.postconfig.push(Paginate);
                        // Otherwise, paginate away
                        else metaBook.Paginate("config");}}
                else {
                    // If you've already paginated, revert
                    if (metaBook.layout) {
                        metaBook.layout.Revert();
                        metaBook.layout=false;}
                    else if (((metaBook.layout)&&(!(metaBook.layout.done)))) {
                        if (metaBook.layout.timer) {
                            clearTimeout(metaBook.layout.timer);
                            metaBook.layout.timer=false;}
                        metaBook.layout.Revert();
                        metaBook.layout=false;}
                    metaBook.bypage=false;
                    if (metaBook.layout) {
                        metaBook.layout.Revert();
                        metaBook.layout=false;}
                    dropClass(document.body,"_BYPAGE");
                    addClass(document.body,"_SCROLL");
                    fdjt.DOM.tweakFonts(metaBook.content);}});

        function updateLayoutProperty(name,val){
            // This updates layout properties
            if (val===true) 
                fdjtDOM.addClass(metaBook.body,"metabook"+name);
            else if (!(val))
                fdjtDOM.dropClass(
                    metaBook.body,new RegExp("metabook"+name+"\\w*"));
            else fdjtDOM.swapClass(
                metaBook.body,new RegExp("metabook"+name+"\\w*"),
                "metabook"+name+val);
            metaBook[name]=val;
            if ((metaBook.postconfig)&&(metaBook.content)) {
                if (metaBook.postconfig.indexOf(metaBook.sizeContent)<0)
                    metaBook.sized=false;
                    metaBook.postconfig.push(metaBook.sizeContent);}
            else if (metaBook.content) metaBook.sizeContent();
            if (metaBook.layout) {
                // If you're already paginated, repaginate.  Either
                // when done with the config or immediately.
                if (metaBook.postconfig) {
                    metaBook.postconfig.push(function(){
                        metaBook.Paginate(name);});}
                else {
                    metaBook.Paginate(name);}}}
        metaBook.addConfig("bodysize",updateLayoutProperty);
        metaBook.addConfig("bodyfamily",updateLayoutProperty);
        metaBook.addConfig("bodyspacing",updateLayoutProperty);
        metaBook.addConfig("justify",updateLayoutProperty);
        
        function getLayoutID(width,height,family,size,spacing,justify,source_id){
            var page=fdjtID("CODEXPAGE");
            var left=page.style.left, right=page.style.right;
            var layout_source=fdjt.CodexLayout.sourcehash;
            page.style.left=""; page.style.right="";
            if (!(width))
                width=getGeometry(page,false,true).width;
            if (!(height))
                height=getGeometry(fdjtID("CODEXPAGE"),false,true).inner_height;
            if (!(family)) family=metaBook.bodyfamily||"serif";
            if (!(size)) size=metaBook.bodysize||"normal";
            if (!(source_id))
                source_id=metaBook.sourceid||fdjtHash.hex_md5(metaBook.docuri);
            if (!(justify)) justify=metaBook.justify;
            if (!(spacing)) justify=metaBook.bodyspacing;
            page.style.left=left; page.style.right=right;
            return fdjtString("%dx%d-%s-%s%s%s(%s)%s",
                              width,height,family,size,
                              ((spacing)?("-"+spacing):("")),
                              ((justify)?("-j"):("")),
                              // Layout depends on the actual file ID,
                              // if we've got one, rather than just
                              // the REFURI
                              source_id,
                              ((layout_source)?("["+layout_source+"]"):("")));}
        metaBook.getLayoutID=getLayoutID;

        function layoutCached(layout_id){
            if (!(layout_id)) layout_id=getLayoutID();
            else if (typeof layout_id === "number")
                layout_id=getLayoutID.apply(null,arguments);
            else {}
            var layouts=getLocal("metabook.layouts("+metaBook.sourceid+")",true);
            return ((layouts)&&(layouts.indexOf(layout_id)>=0));}
        metaBook.layoutCached=layoutCached;
        
        function clearLayouts(source_id){
            if (typeof source_id === "undefined") source_id=metaBook.sourceid;
            if (source_id) {
                var layouts=getLocal("metabook.layouts("+metaBook.sourceid+")",true);
                var i=0, lim=layouts.length; while (i<lim) {
                    var layout=layouts[i++];
                    fdjtLog("Dropping layout %s",layout);
                    CodexLayout.dropLayout(layout);}
                fdjtState.dropLocal("metabook.layouts("+metaBook.sourceid+")");}
            else {
                CodexLayout.clearLayouts();
                CodexLayout.clearAll();
                fdjtState.dropLocal(/^metabook.layouts\(/g);}}
        metaBook.clearLayouts=clearLayouts;

        function getLayoutArgs(){
            var width=getGeometry(fdjtID("CODEXPAGE"),false,true).width;
            var height=getGeometry(fdjtID("CODEXPAGE"),false,true).inner_height;
            var origin=fdjtDOM("div#CODEXCONTENT");
            var container=fdjtDOM("div.metabookpages#METABOOKPAGES");
            var bodyfamily=metaBook.bodyfamily||"serif";
            var bodysize=metaBook.bodysize||"normal";
            var sourceid=metaBook.sourceid||fdjtHash.hex_md5(metaBook.docuri);
            var justify=metaBook.justify;
            var sourcehash=fdjt.CodexLayout.sourcehash;
            var layout_id=fdjtString(
                "%dx%d-%s-%s%s(%s)%s",
                width,height,bodyfamily,bodysize,
                ((justify)?("-j"):("")),
                // Layout depends on the actual file ID, if we've got
                // one, rather than just the REFURI
                sourceid||metaBook.refuri,
                ((sourcehash)?("["+sourcehash+"]"):("")));

            var docinfo=metaBook.docinfo;
            var goneto=false;

            function setPageInfo(page,layout){
                var pages=layout.pages, pagenum=layout.pagenum;
                var topnode=getPageTop(page);
                var topid=topnode.codexbaseid||topnode.id;
                var curloc=false;
                if (topnode) {
                    var topstart=mbID(topid);
                    var locoff=((topstart===topnode)?(0):
                                (getLocOff(pages,topstart,topnode)));
                    var info=docinfo[topid];
                    curloc=info.starts_at+locoff;
                    if (topid) page.setAttribute("data-topid",topid);
                    page.setAttribute("data-sbookloc",curloc);}
                else {
                    if ((pagenum)&&(pagenum>1)) {
                        var prevpage=pages[pagenum-2];
                        var lastid=getPageLastID(prevpage);
                        var lastinfo=((lastid)&&(docinfo[lastid]));
                        if (lastinfo) {
                            curloc=lastinfo.starts_at;
                            page.setAttribute("data-sbookloc",lastinfo.ends_at);}
                        else {
                            var prevoff=prevpage.getAttribute("data-sbookloc");
                            if (prevoff)
                                page.setAttribute("data-sbookloc",prevoff);
                            else page.setAttribute("data-sbookloc","0");}}}
                if ((typeof curloc === "number")&&(pagenum)&&
                    (!(metaBook.curpage))&&(metaBook.state)&&(goneto!==metaBook.state)&&
                    (metaBook.state.hasOwnProperty('location'))&&
                    (curloc>=metaBook.state.location)) {
                    goneto=metaBook.state;
                    setTimeout(function(){
                        metaBook.GoToPage(pagenum,"layout",false);},
                               10);}}
            
            function getPageTop(node) {
                var last=false;
                if (hasClass(node,"codexpage")) {}
                else if (((node.id)&&(docinfo[node.id]))||
                         ((node.codexbaseid)&&(docinfo[node.codexbaseid]))) {
                    if (hasContent(node,true)) last=node;}
                else {}
                var children=node.childNodes;
                if (children) {
                    var i=0; var lim=children.length;
                    while (i<lim) {
                        var child=children[i++];
                        if (child.nodeType===1) {
                            var first=getPageTop(child);
                            if (first) return first;}}}
                return last;}
            function getPageLastID(node,id) {
                if (hasClass(node,"codexpage")) {}
                else if ((node.id)&&(!(node.codexbaseid))&&
                         (metaBook.docinfo[node.id]))
                    id=node.id;
                if (node.nodeType!==1) return id;
                var children=node.childNodes;
                if (children) {
                    var i=0; var lim=children.length;
                    while (i<lim) {
                        var child=children[i++];
                        if (child.nodeType===1) {
                            id=getPageLastID(child,id);}}}
                return id;}
            
            function getDupNode(under,id){
                var children;
                if (under.nodeType!==1) return false;
                else if (under.codexbaseid===id) return under;
                if (!(children=under.childNodes))
                    return false;
                else if (!(children.length)) return false;
                else {
                    var i=0, lim=children.length;
                    while (i<lim) {
                        var found=getDupNode(children[i++],id);
                        if (found) return found;}}}

            function getLocOff(pages,topstart,topnode){
                var id=topstart.id; var locoff=0;
                var pagescan=topstart, pagenum, elt=topstart;
                while (pagescan) {
                    if (hasClass(pagescan,"codexpage")) {
                        break;}
                    else pagescan=pagescan.parentNode;}
                if (!(pagescan)) return locoff;
                else pagenum=parseInt(
                    pagescan.getAttribute("data-pagenum"),10);
                while ((elt)&&(elt!==topnode)) {
                    var width=textWidth(elt);
                    if (width) locoff=locoff+width;
                    pagescan=pages[pagenum++];
                    if (pagescan) elt=getDupNode(pagescan,id);
                    else return locoff;}
                return locoff;}

            // We track the sourceid to know when, for example, any
            //  cached layouts need to be invalidated.
            var saved_sourceid=
                fdjtState.getLocal("metabook.sourceid("+metaBook.refuri+")");
            if ((saved_sourceid)&&(sourceid)&&(sourceid!==sourceid)) {
                var layouts=fdjtState.getLocal("fdjtmetaBook.layouts",true);
                var kept=[];
                if (layouts) {
                    var pat=new RegExp("\\("+saved_sourceid+"\\)$");
                    var i=0, lim=layouts.length; while (i<lim) {
                        var cacheid=layouts[i++];
                        if (cacheid.search(pat)>0)
                            CodexLayout.dropLayout(cacheid);
                        else kept.push(cacheid);}}
                if (kept.length)
                    fdjtState.setLocal("fdjtmetaBook.layouts",kept);
                else fdjtState.dropLocal("fdjtmetaBook.layouts",kept);}
            
            if (sourceid)
                fdjtState.setLocal("metabook.sourceid("+metaBook.refuri+")",
                                   sourceid);
            
            var args={page_height: height,page_width: width,
                      orientation: fdjtDOM.getOrientation(window),
                      // Include this line to disable timeslicing
                      //  of layout (can help with debugging)
                      // timeslice: false,timeskip: false,
                      container: container,origin: origin,
                      pagerule: metaBook.CSS.pagerule,
                      tracelevel: mB.Trace.layout,
                      layout_id: layout_id,
                      pagefn: setPageInfo,
                      logfn: fdjtLog};
            fdjtDOM.replace("METABOOKPAGES",container);
            metaBook.pages=container;
            
            var avoidbreakclasses=
                /\b(sbookfullpage)|(sbooktitlepage)|(stanza)\b/;
            args.avoidbreakinside=[avoidbreakclasses];
            avoidbreakclasses=
                fdjtDOM.sel(fdjtDOM.getMeta("avoidbreakinside",true));
            if (avoidbreakclasses)
                args.avoidbreakinside.push(avoidbreakclasses);
            avoidbreakclasses=
                fdjtDOM.sel(fdjtDOM.getMeta("SBOOKS.avoidbreakinside",true));
            if (avoidbreakclasses)
                args.avoidbreakinside.push(avoidbreakclasses);

            var fbb=fdjtDOM.getMeta("alwaysbreakbefore",true).concat(
                fdjtDOM.getMeta("SBOOKS.alwaysbreakbefore",true)).concat(
                    fdjtDOM.getMeta("forcebreakbefore",true)).concat(
                        fdjtDOM.getMeta("SBOOKS.forcebreakbefore",true));
            if ((fbb)&&(fbb.length)) args.forcebreakbefore=fdjtDOM.sel(fbb);

            var fba=fdjtDOM.getMeta("alwaysbreakafter",true).concat(
                fdjtDOM.getMeta("SBOOKS.alwaysbreakafter",true)).concat(
                    fdjtDOM.getMeta("forcebreakafter",true)).concat(
                        fdjtDOM.getMeta("SBOOKS.forcebreakafter",true));
            if ((fba)&&(fba.length)) args.forcebreakafter=fdjtDOM.sel(fba);

            var abb=fdjtDOM.getMeta("avoidbreakbefore",true).concat(
                fdjtDOM.getMeta("SBOOKS.avoidbreakbefore",true)).concat(
                    fdjtDOM.getMeta("dontbreakbefore",true)).concat(
                        fdjtDOM.getMeta("SBOOKS.dontbreakbefore",true));
            if ((abb)&&(abb.length)) args.avoidbreakbefore=fdjtDOM.sel(abb);

            var aba=fdjtDOM.getMeta("avoidbreakafter",true).concat(
                fdjtDOM.getMeta("SBOOKS.avoidbreakafter",true)).concat(
                    fdjtDOM.getMeta("dontbreakafter",true)).concat(
                        fdjtDOM.getMeta("SBOOKS.dontbreakafter",true));
            if ((aba)&&(aba.length)) args.avoidbreakafter=fdjtDOM.sel(aba);

            var abi=fdjtDOM.getMeta("avoidbreakinside",true).concat(
                fdjtDOM.getMeta("SBOOKS.avoidbreakinside",true)).concat(
                    fdjtDOM.getMeta("dontbreakinside",true)).concat(
                        fdjtDOM.getMeta("SBOOKS.dontbreakinside",true));
            if ((abi)&&(abi.length)) args.avoidbreakinside=fdjtDOM.sel(abi);

            var fullpages=[".sbookfullpage",".sbooktitlepage",".sbookpage"].
                concat(
                    fdjtDOM.getMeta("SBOOKS.fullpage",true)).concat(
                        fdjtDOM.getMeta("SBOOKS.fullpage",true)).concat(
                            fdjtDOM.getMeta("sbookfullpage",true));
            if ((fullpages)&&(fullpages.length))
                args.fullpages=fdjtDOM.sel(fullpages);
            
            var floatpages=[".sbookfloatpage"].concat(
                fdjtDOM.getMeta("SBOOKS.floatpage",true)).concat(
                    fdjtDOM.getMeta("SBOOKS.floatpage",true)).concat(
                        fdjtDOM.getMeta("sbookfloatpage",true));
            if ((floatpages)&&(floatpages.length))
                args.floatpages=fdjtDOM.sel(floatpages);
            
            var floating=[".sbookfloatpage"].concat(
                fdjtDOM.getMeta("SBOOKS.floatpage",true)).concat(
                    fdjtDOM.getMeta("SBOOKS.floatpage",true)).concat(
                        fdjtDOM.getMeta("sbookfloatpage",true));
            if ((floating)&&(floating.length))
                args.floating=fdjtDOM.sel(floating);

            var scaletopage=fdjtDOM.getMeta("sbookscaletopage",true);
            if ((scaletopage)&&(scaletopage.length)) 
                scaletopage.concat([".sbookscaletopage",".sbookpagescaled"]);
            else scaletopage=[".sbookscaletopage",".sbookpagescaled"];
            args.scaletopage=scaletopage=scaletopage;
            
            if ((fdjtDOM.getMeta("metaBook.dontbreakblocks"))||
                (fdjtDOM.getMeta("metaBook.keepblocks"))||
                (fdjtDOM.getMeta("~=metaBook.dontbreakblocks"))||
                (fdjtDOM.getMeta("~=metaBook.keepblocks"))||
                (fdjtDOM.getMeta("~dontbreakblocks"))||
                (fdjtDOM.getMeta("~keepblocks")))
                args.break_blocks=false;
            else args.break_blocks=true;
            
            if ((fdjtDOM.getMeta("metaBook.dontscalepages"))||
                (fdjtDOM.getMeta("~=metaBook.dontscalepages"))||
                (fdjtDOM.getMeta("dontscalepages")))
                args.scale_pages=false;
            else args.scale_pages=true;

            args.dontsave=fdjt.DOM.Selector(".glossmark");
            
            return args;}
        CodexLayout.getLayoutArgs=getLayoutArgs;

        function sizeCodexPage(){
            var page=metaBook.page, geom=getGeometry(page);
            var page_height=geom.height, view_height=fdjtDOM.viewHeight();
            var page_width=geom.width, view_width=fdjtDOM.viewWidth();
            var page_hmargin=(view_width-page_width);
            var page_vmargin=(view_height-page_height);
            // Set explicit left and right (and top and bottom) to
            // ensure that the page is centered (sometimes not on
            // Safari)
            if (page_hmargin!==50) {
                page.style.left=page_hmargin/2+'px';
                page.style.right=page_hmargin/2+'px';}
            else page.style.left=page.style.right='';
            if (page_vmargin<80) metaBook.fullheight=true;
            else metaBook.fullheight=false;
            if (page_hmargin<80) metaBook.fullwidth=true;
            else metaBook.fullwidth=false;
            if (metaBook.fullwidth) addClass(document.body,"_FULLWIDTH");
            else dropClass(document.body,"_FULLWIDTH");
            if (metaBook.fullheight) addClass(document.body,"_FULLHEIGHT");
            else dropClass(document.body,"_FULLHEIGHT");}
        metaBook.sizeCodexPage=sizeCodexPage;
        
        function scaleLayout(flag){
            // This adjusts to a resize by just scaling (using CSS
            // transforms) the current layout.
            var cheaprule=metaBook.CSS.resizerule;
            if (typeof flag==="undefined") flag=true;
            if ((flag)&&(hasClass(document.body,"_SCALEDLAYOUT"))) return;
            if ((!(flag))&&
                (!(hasClass(document.body,"_SCALEDLAYOUT")))) return;
            if (cheaprule) {
                cheaprule.style[fdjtDOM.transform]="";
                cheaprule.style[fdjtDOM.transformOrigin]="";
                cheaprule.style.left="";
                cheaprule.style.top="";}
            if (!(flag)) {
                dropClass(document.body,"_SCALEDLAYOUT");
                sizeCodexPage();
                return;}
            else sizeCodexPage();
            var layout=metaBook.layout;
            var geom=getGeometry(fdjtID("CODEXPAGE"),false,true);
            var width=geom.width, height=geom.inner_height;
            var lwidth=layout.width, lheight=layout.height;
            var hscale=height/lheight, vscale=width/lwidth;
            var scale=((hscale<vscale)?(hscale):(vscale));
            if (!(cheaprule)) {
                var s="#CODEXPAGE div.codexpage";
                metaBook.CSS.resizerule=cheaprule=fdjtDOM.addCSSRule(
                    s+", body._ANIMATE.mbPREVIEW "+s,"");}
            cheaprule.style[fdjtDOM.transformOrigin]="left top";
            cheaprule.style[fdjtDOM.transform]="scale("+scale+","+scale+")";
            var nwidth=lwidth*scale, nheight=lheight*scale;
            // If the width has shrunk (it can't have grown), that means
            //  that there is an additional left margin, so we move the page
            //  over to the left
            if (nwidth<width)
                cheaprule.style.left=((width-nwidth)/2)+"px";
            if (nheight<height) cheaprule.style.top="0px";
            var n=metaBook.pagecount;
            var spanwidth=(fdjtID("METABOOKPAGEBAR").offsetWidth)/n;
            if (spanwidth<1) spanwidth=1;
            if (metaBook.CSS.pagespanrule)
                metaBook.CSS.pagespanrule.style.width=spanwidth+"px";
            else metaBook.CSS.pagespanrule=fdjtDOM.addCSSRule(
                "div.metabookpagespans > span","width: "+spanwidth+"px;");
            addClass(document.body,"_SCALEDLAYOUT");}
        metaBook.scaleLayout=scaleLayout;
        
        /* Updating the page display */

        function updatePageDisplay(pagenum,location,classname) {
            var update_progress=(!(classname));
            if (!(classname)) classname="current";
            var npages=metaBook.pagecount;
            var page_elt=fdjt.ID("METABOOKPAGESPAN"+pagenum);
            var cur=getChildren("METABOOKPAGEBAR","."+classname);
            if (cur[0]!==page_elt) {
                dropClass(cur,classname);
                addClass(page_elt,classname);}
            var locoff;
            if (typeof location==='number') {
                var max_loc=metaBook.ends_at;
                var pct=(100*location)/max_loc;
                // This is (very roughly) intended to be the precision needed
                //  for line level (40 character) accuracy.
                var prec=Math.round(Math.log(max_loc/40)/Math.log(10))-2;
                if (prec<0) prec=0;
                locoff=fdjtDOM(
                    "span.metabookloc#METABOOKLOCPCT",
                    ((prec===0)?(Math.floor(pct)):
                     (fdjtString.precString(pct,prec)))+"%");
                locoff.title=location+"/"+max_loc;}
            else locoff=fdjtDOM("span.metabookloc#METABOOKLOCPCT");
            var pageno_text=fdjtDOM(
                "span#METABOOKPAGENOTEXT.metabookpageno",pagenum,"/",npages);
            fdjtDOM.replace("METABOOKPAGENOTEXT",pageno_text);
            fdjtDOM.replace("METABOOKLOCPCT",locoff);
            pageno_text.title="select to change page number";
            locoff.title=
                ((locoff.title)||"")+
                ((locoff.title)?("; "):(""))+
                " select to change %";
            if (update_progress) {
                var page_progress=fdjtID("METABOOKPAGEPROGRESS");
                if (page_progress) page_progress.style.width=
                    (((pagenum-1)*100)/npages)+"%";}
            if (update_progress) {
                /* Update section markers */
                var page=fdjtID("CODEXPAGE"+pagenum);
                var topid=(page)&&page.getAttribute("data-topid");
                var info=(topid)&&metaBook.docinfo[topid];
                if (info) {
                    var head1=((info.level)?(info):(info.head));
                    var head2=((head1)&&(head1.head));
                    var head3=((head2)&&(head2.head));
                    var span1=(head1)&&getPageSpan(head1);
                    var span2=(head2)&&getPageSpan(head2);
                    var span3=(head3)&&getPageSpan(head3);
                    while ((span3)&&(span2)&&(span1.width<=1)) {
                        var nextspan=(head3.head)&&(getPageSpan(head3.head));
                        if (!(nextspan)) break;
                        head1=head2; head2=head3; head3=head2.head;
                        span1=span2; span2=span3; span3=nextspan;}
                    var marker1=fdjtID("METABOOKSECTMARKER1");
                    var marker2=fdjtID("METABOOKSECTMARKER2");
                    var marker3=fdjtID("METABOOKSECTMARKER3");
                    if ((span1)&&(span1.width)) {
                        marker1.style.left=(100*((span1.start-1)/npages))+"%";
                        marker1.style.width=(100*(span1.width/npages))+"%";
                        marker1.style.display='block';                    }
                    else marker1.style.display='none';
                    if ((span2)&&(span2.width)) {
                        marker2.style.left=(100*((span2.start-1)/npages))+"%";
                        marker2.style.width=(100*(span2.width/npages))+"%";
                        marker2.style.display='block';                    }
                    else marker2.style.display='none';
                    if ((span3)&&(span3.width)) {
                        marker3.style.left=(100*((span3.start-1)/npages))+"%";
                        marker3.style.width=(100*(span3.width/npages))+"%";
                        marker3.style.display='block';                    }
                    else marker3.style.display='none';}}
            fdjtDOM.addListeners(
                locoff,metaBook.UI.handlers[metaBook.ui]["#METABOOKLOCPCT"]);
            fdjtDOM.addListeners(
                pageno_text,metaBook.UI.handlers[metaBook.ui]["#METABOOKPAGENOTEXT"]);}
        metaBook.updatePageDisplay=updatePageDisplay;
        
        function getPageSpan(headinfo) {
            var scan=headinfo, nextinfo, result={};
            while (scan) {
                if (scan.next) {nextinfo=scan.next; break;}
                else scan=scan.head;}
            var start_page=getPage(headinfo.frag,headinfo.starts_at);
            if (!(start_page)) return false;
            else result.start=parseInt(
                (start_page).getAttribute("data-pagenum"),10);
            if (nextinfo) {
                var end_page=getPage(nextinfo.frag,nextinfo.starts_at);
                if (end_page)
                    result.end=parseInt(
                        (end_page).getAttribute("data-pagenum"),10);}
            if (!(result.end)) result.end=metaBook.layout.pages.length+1;
            result.width=result.end-result.start;
            return result;}

        /* Page info */
        
        function setupPagebar(){
            var i=0, n=metaBook.pagecount; var html=[];
            var pagemax=fdjt.ID("METABOOKGOTOPAGEMAX");
            if (pagemax) pagemax.innerHTML=""+n;
            var spanwidth=
                (fdjtID("METABOOKPAGEBAR").offsetWidth)/n;
            if (spanwidth<1) spanwidth=1;
            if (metaBook.CSS.pagespanrule)
                metaBook.CSS.pagespanrule.style.width=spanwidth+"px";
            else metaBook.CSS.pagespanrule=fdjtDOM.addCSSRule(
                "div.metabookpagespans > span","width: "+spanwidth+"px;");
            while (i<n) {
                var page=metaBook.layout.pages[i];
                var topid=(page)&&(page.getAttribute("data-topid"));
                var topinfo=(topid)&&(metaBook.docinfo[topid]);
                var zstyle=(((topinfo)&&(topinfo.level))?
                            ("; z-index: 50;"):(""));
                html.push("<span id='METABOOKPAGESPAN"+(i+1)+"' "+
                          "class='metabookpagespan' "+
                          "title='p"+(i+1)+". Hold to glimpse, tap to jump' "+
                          "style='left: "+(100*(i/n))+"%"+zstyle+"'"+
                          ">"+(i+1)+"</span>");
                i++;}
            var spans=fdjtID("METABOOKPAGESPANS");
            spans.innerHTML=html.join("");
            var outer_width=getGeometry(spans);
            var inner_width=fdjt.DOM.getInsideBounds(spans);
            var tweak=outer_width/inner_width;
            spans.style[fdjt.DOM.transform]="scale("+tweak+",1)";}
        metaBook.setupPagebar=setupPagebar;
        
        /* Movement by pages */
        
        var curpage=false;
        
        function GoToPage(spec,caller,savestate,skiphist){
            if (typeof savestate === 'undefined') savestate=true;
            if (metaBook.previewing) metaBook.stopPreview("GoToPage",false);
            dropClass(document.body,"mbSHOWHELP");
            if (metaBook.clearGlossmark) metaBook.clearGlossmark();
            if (metaBook.mode==="addgloss") metaBook.setMode(false,false);
            var page=(metaBook.layout)&&
                (metaBook.layout.getPage(spec)||metaBook.layout.getPage(1));
            if (page) {
                var pagenum=parseInt(page.getAttribute("data-pagenum"),10);
                var dirclass=false;
                if (savestate) metaBook.clearStateDialog();
                if (mB.Trace.flips)
                    fdjtLog("GoToPage/%s Flipping to %o (%d) for %o",
                            caller,page,pagenum,spec);
                if (!(curpage)) {
                    var curpages=metaBook.pages.getElementsByClassName('curpage');
                    if (curpages.length) dropClass(toArray(curpages),"curpage");
                    addClass(page,"curpage");}
                else {
                    var curpagestring=curpage.getAttribute("data-pagenum");
                    var curnum=parseInt(curpagestring,10);
                    // This does the page flip animation;
                    dropClass(curpage,/(oldpage|newpage|onleft|onright)/g);
                    dropClass(page,/(oldpage|newpage|onleft|onright)/g);
                    if (pagenum<curnum) dirclass="onleft";
                    else dirclass="onright";
                    if (dirclass) addClass(page,dirclass);
                    addClass(curpage,"oldpage");
                    addClass(page,"newpage");
                    var lastpage=curpage;
                    setTimeout(function(){
                        // This handles left over curpages from race
                        // conditions, etc.
                        var whoops=
                            metaBook.pages.getElementsByClassName('curpage');
                        if (whoops.length) dropClass(toArray(whoops),"curpage");
                        dropClass(lastpage,"curpage");
                        addClass(page,"curpage");
                        dropClass(page,"newpage");
                        dropClass(page,"onright");},
                               50);
                    setTimeout(function(){
                        dropClass(lastpage,"oldpage");},
                               500);}
                if (typeof spec === 'number') {
                    var locval=page.getAttribute("data-sbookloc");
                    var location=((locval)&&(parseInt(locval,10)));
                    if (location) metaBook.setLocation(location);}
                updatePageDisplay(pagenum,metaBook.location);
                curpage=page; metaBook.curpage=pagenum;
                var curnode=mbID(page.getAttribute("data-topid"));
                if (savestate) {
                    metaBook.point=curnode;
                    if (!((metaBook.hudup)||(metaBook.mode))) metaBook.skimming=false;
                    metaBook.setHead(curnode);}
                if ((savestate)&&(page)) {
                    metaBook.saveState(
                        {location: atoi(page.getAttribute("data-sbookloc"),10),
                         page: atoi(page.getAttribute("data-pagenum"),10),
                         target: ((curnode)&&
                                  ((curnode.getAttribute("data-baseid"))||(curnode.id)))},
                        skiphist);}
                var glossed=fdjtDOM.$(".glossed",page);
                if (glossed) {
                    var addGlossmark=metaBook.UI.addGlossmark;
                    var i=0; var lim=glossed.length;
                    while (i<lim) addGlossmark(glossed[i++]);}}}
        metaBook.GoToPage=GoToPage;
        

        /** Previewing **/

        var previewing=false;
        function startPagePreview(spec,caller){
            var page=((spec.nodeType)&&(getParent(spec,".codexpage")))||
                metaBook.layout.getPage(spec)||
                metaBook.layout.getPage(1);
            if (!(page)) return;
            var pagenum=parseInt(page.getAttribute("data-pagenum"),10);
            var pageloc=parseInt(page.getAttribute("data-sbookloc"),10);
            if (previewing===page) return;
            if (previewing) dropClass(previewing,"previewpage");
            dropClass(getChildren(metaBook.pages,".previewpage"),
                      "previewpage");
            if ((mB.Trace.flips)||(mB.Trace.gestures))
                fdjtLog("startPagePreview/%s to %o (%d) for %o",
                        caller||"nocaller",page,pagenum,spec);
            if (curpage) addClass(curpage,"hidepage");
            addClass(page,"previewpage");
            metaBook.previewing=previewing=page;
            addClass(document.body,"mbPREVIEW");
            updatePageDisplay(pagenum,pageloc,"preview");}
        metaBook.startPagePreview=startPagePreview;
        function stopPagePreview(caller,target){
            var pagenum=parseInt(curpage.getAttribute("data-pagenum"),10);
            if ((mB.Trace.flips)||(mB.Trace.gestures))
                fdjtLog("stopPagePreview/%s from %o to %o (%d)",
                        caller||"nocaller",previewing,curpage,pagenum);
            var newpage=false;
            if (!(previewing)) return;
            if ((target)&&(target.nodeType)) {
                dropClass(curpage,"curpage");
                dropClass(curpage,"hidepage");
                addClass(previewing,"curpage");
                if (hasClass(target,"codexpage")) newpage=target;
                else newpage=getParent(target,".codexpage");}
            else if (target)  {
                dropClass(curpage,"curpage");
                dropClass(curpage,"hidepage");
                addClass(previewing,"curpage");
                newpage=curpage;}
            else {
                dropClass(previewing,"preview");
                dropClass(curpage,"hidepage");}
            dropClass(previewing,"previewpage");
            dropClass(getChildren(metaBook.pages,".previewpage"),
                      "previewpage");
            metaBook.previewing=previewing=false;
            dropClass(document.body,"mbPREVIEW");
            if (newpage) {
                var newnum=parseInt(newpage.getAttribute("data-pagenum"),10);
                var newloc=metaBook.getLocInfo(target);
                updatePageDisplay(newnum,((newloc)&&(newloc.starts_at)),
                                  "current");}
            else updatePageDisplay(pagenum,metaBook.location,"current");
            if (typeof newpage === "number") metaBook.GoToPage(newpage);}
        metaBook.stopPagePreview=stopPagePreview;
        
        function getPage(arg,location){
            var node=((arg)&&
                      ((arg.nodeType)?(arg):
                       (typeof arg === "string")?(mbID(arg)):
                       (false)));
            var page=((node)&&(getParent(node,".codexpage")));
            if ((!(location))||(!(page))) return page;
            var loc=parseInt(page.getAttribute("data-sbookloc"),10);
            if (loc===location) return page;
            var layout=metaBook.layout, pages=layout.pages, npages=pages.length;
            var i=((page)?(parseInt(page.getAttribute("data-pagenum"),10)):(1)); i--;
            var prev=page; while (i<npages) {
                var next=pages[i++];
                loc=parseInt(next.getAttribute("data-sbookloc"),10);
                if (typeof loc !== "number") return prev;
                else if (loc===location) return next;
                else if (loc>location) return prev;
                else i++;}
            return page;}
        metaBook.getPage=getPage;
        
        function refreshLayout(why){
            metaBook.Paginate(why,{forced: true});}
        metaBook.refreshLayout=refreshLayout;
        
        function syncLayout(){
            var geom=getGeometry(fdjtID("CODEXPAGE"),false,true);
            var height=geom.inner_height, width=geom.width;
            if ((metaBook.layout.height===height)&&
                (metaBook.layout.width===width))
                return;
            else refreshLayout("sync_resize");}

        function displaySync(){
            if ((metaBook.pagecount)&&(metaBook.curpage))
                metaBook.GoToPage(metaBook.curpage,"displaySync",false);}
        metaBook.displaySync=displaySync;

        return Paginate;})();

/* Emacs local variables
   ;;;  Local variables: ***
   ;;;  compile-command: "cd ..; make" ***
   ;;;  indent-tabs-mode: nil ***
   ;;;  End: ***
*/
