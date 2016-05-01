/* -*- Mode: Javascript; Character-encoding: utf-8; -*- */

/* ###################### metabook/layout.js ###################### */

/* Copyright (C) 2009-2015 beingmeta, inc.

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

metaBook.Paginate=
    (function(){
        "use strict";

        var mB=metaBook;
        var Trace=mB.Trace;
        var Timeline=mB.Timeline;
        var fdjtString=fdjt.String;
        var fdjtState=fdjt.State;
        var fdjtHash=fdjt.Hash;
        var fdjtTime=fdjt.Time;
        var fdjtLog=fdjt.Log;
        var fdjtDOM=fdjt.DOM;
        var fdjtAsync=fdjt.Async;
        var $ID=fdjt.ID;
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

        var getMeta=fdjtDOM.getMeta;

        var atoi=parseInt;

        var layout_preview_interval=2000;
        var layout_previewing=false;
        var layout_preview_next=false;
        var layout_waiting=false;
        
        function layoutWait(){
            if (!(layout_waiting)) layout_waiting=[];
            layout_preview_next=fdjtTime();
            if ((Trace.layout)||(Trace.startup)||(Trace.nav)||(Trace.flips)||(Trace.resize))
                fdjtLog("Waiting for layout to finish");
            setTimeout(function(){addClass("MBLAYOUTWAIT","live");},
                       100);}
        function stopLayoutWait(){
            if (layout_previewing) {
                dropClass(layout_previewing,"previewcurpage");
                dropClass(layout_previewing,"curpage");
                layout_previewing=false;}
            if (!(layout_waiting)) return;
            if ((Trace.layout)||(Trace.startup)||(Trace.nav)||(Trace.flips)||(Trace.resize))
                fdjtLog("Done with layout wait");
            var readyfns=layout_waiting;
            layout_waiting=false;
            layout_preview_next=false;
            setTimeout(function(){dropClass("MBLAYOUTWAIT","live");},
                       200);
            var i=0, lim=readyfns.length; while (i<lim) {
                readyfns[i++]();}}
        function layoutReady(whenready){
            if ((mB.layout)&&(mB.layout.done))
                return whenready();
            else if (layout_waiting)
                layout_waiting.push(whenready);
            else layout_waiting=[whenready];}
        metaBook.layoutReady=layoutReady;

        function layoutMessage(string,pct){
            var pb=$ID("METABOOKLAYOUTMESSAGE");
            if (pb) {
                fdjt.UI.ProgressBar.setMessage(pb,string);
                if (typeof pct==="number")
                    fdjt.UI.ProgressBar.setProgress(pb,pct);}
            var fpb=$ID("METABOOKLAYOUTADJUST");
            if (layout_waiting) {
                var layout=mB.layout, now=fdjtTime();
                if (fpb) fpb.innerHTML="Updating layout ("+Math.round(pct)+"%)";
                if (now>layout_preview_next) {
                    var pages=layout.pages, latest=pages[pages.length-2];
                    dropClass(layout_previewing,"curpage");
                    dropClass(layout_previewing,"previewcurpage");
                    if (latest) {
                        addClass(latest,"curpage");
                        addClass(latest,"previewcurpage");}
                    layout_previewing=latest;
                    layout_preview_next=now+layout_preview_interval;}}
            else if (fpb) fpb.innerHTML="Finishing layout @"+Math.round(pct)+"%";
            else {}}

        var layout_next_report=false;
        var layout_report_interval=500;
        
        /* Reporting progress, debugging */
        function layout_progress(info){
            var tracelevel=info.tracelevel;
            var started=info.started;

            var pagenum=info.pagenum;
            if (!(pagenum)) return;

            var now=fdjtTime();
            var howlong=secs2short((now-started)/1000);
            var indicator=$ID("METABOOKLAYOUTINDICATOR");
            if (info.done) {
                if (indicator) indicator.style.width="100%";
                layout_next_report=false;
                dropClass(layout_previewing,"curpage");
                dropClass(layout_previewing,"previewcurpage");
                layout_previewing=false;
                fdjtDOM.replace(
                    "METABOOKPAGENOTEXT",
                    fdjtDOM("div.metabookpageno#METABOOKPAGENOTEXT",
                            mB.curpage||"?","/",pagenum));
                layoutMessage(fdjtString(
                    "Finished laying out %d %dx%d pages in %s",
                    pagenum,info.width,info.height,
                    secs2short((info.done-info.started)/1000)),
                              100);
                fdjtLog("Finished laying out %d %dx%d pages in %s",
                        pagenum,info.width,info.height,
                        secs2short((info.done-info.started)/1000));}
            else if ((layout_next_report)&&(now<layout_next_report)) return;
            else {
                layout_next_report=now+layout_report_interval;
                if ((info.lastid)&&(mB.docinfo)&&
                    ((mB.docinfo[info.lastid]))) {
                    var docinfo=mB.docinfo;
                    var maxloc=docinfo._maxloc;
                    var lastloc=docinfo[info.lastid].starts_at;
                    var pct=(100*lastloc)/maxloc, fpct=Math.floor(pct);
                    if (indicator) indicator.style.width=fpct+"%";
                    fdjtDOM.replace(
                        "METABOOKPAGENOTEXT",
                        fdjtDOM("div.metabookpageno#METABOOKPAGENOTEXT",
                                mB.curpage||"?",
                                "/",pagenum," (",fpct,"%)"));
                    if (mB.devmode) 
                        layoutMessage(fdjtString(
                            "Formatted %d %dx%d pages (%d%%)",
                            pagenum,info.width,info.height,fpct),
                                      pct);
                    else layoutMessage(fdjtString(
                        "Formatting for your device (%d%%)",fpct),
                                       pct);
                    if (tracelevel)
                        fdjtLog("Formatted %d %dx%d pages (%d%%) in %s",
                                pagenum,info.width,info.height,fpct,howlong);}
                else {
                    layoutMessage(fdjtString(
                        "Formatted %d %dx%d pages in %s",
                        info.pagenum,info.width,info.height,howlong));
                    if (tracelevel)
                        fdjtLog("Formatted %d pages in %s",
                                info.pagenum,howlong);}}}

        function Paginate(why,init){
            if (((mB.layout)&&(!(mB.layout.done)))) return;
            if (!(why)) why="because";
            Timeline.page_layout_started=fdjtTime();
            if (Trace.layout)
                fdjtLog("Starting pagination (%s) with %j",why,init);
            layoutMessage("Preparing your book",0);
            dropClass(document.body,"_SCROLL");
            addClass(document.body,"mbLAYOUT");
            scaleLayout(false);
            if (Trace.layout) fdjtLog("Unscaled layout");
            var forced=((init)&&(init.forced));
            var geom=getGeometry($ID("CODEXPAGE"),false,true);
            var height=geom.inner_height, width=geom.width;
            var justify=mB.textjustify;
            var spacing=mB.bodyspacing;
            var size=mB.bodysize||"normal";
            var family=(mB.dyslexical)?("opendyslexic"):
                (mB.bodyfamily||"default");
            if ((!(mB.layout))&&(Trace.startup>1))
                fdjtLog("Page layout requires %dx%d %s pages",
                        width,height,size);
            if (mB.layout) {
                var current=mB.layout;
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
                if (Trace.layout) fdjtLog("Reverting current layout");
                mB.layout.Revert();
                mB.layout=false;}

            // Resize the content
            if (Trace.layout) fdjtLog("Sizing the content");
            mB.sizeContent();

            // Create a new layout
            var layout_args=getLayoutArgs();
            if ((init)&&(init.hasOwnProperty("timeslice"))) {
                layout_args.timeslice=init.timeslice;}
            
            if (Trace.layout) fdjtLog("Starting content layout");
            var layout=new CodexLayout(layout_args);
            layout.bodysize=size; layout.bodyfamily=family;
            mB.layout=layout;

            var timeslice=
                ((layout.hasOwnProperty('timeslice'))?(layout.timeslice):
                 (CodexLayout.timeslice));
            var timeskip=
                ((typeof timeslice === "number")&&
                 ((layout.hasOwnProperty('timeskip'))?(layout.timeskip):
                  (CodexLayout.timeskip)));
            var async=(typeof timeslice === "number");
            
            var layout_id=layout.layout_id;

            function restore_layout(content,layout_id){
                fdjtLog("Using saved layout %s",layout_id);
                $ID("CODEXCONTENT").style.display='none';
                layoutMessage("Using cached layout",0);
                dropClass(document.body,"_SCROLL");
                addClass(document.body,"_BYPAGE");
                layout.started=fdjtTime();
                layout.restoreLayout(content).then(function(){
                    Timeline.layout_restored=fdjtTime();
                    finish_restore(layout);});}
            function finish_restore(layout) {
                var started=layout.started;
                $ID("CODEXPAGE").style.visibility='';
                $ID("CODEXCONTENT").style.visibility='';
                dropClass(document.body,"mbLAYOUT");
                mB.layout=layout;
                mB.pagecount=layout.pages.length;
                fdjtLog("Restored %d-page layout %s in %ds, adding glosses",
                        layout.pages.length,layout_id,
                        (fdjtTime()-started)/1000);
                stopLayoutWait();
                var lostids=layout.lostids, moved_ids=lostids._all_ids;
                var i=0, lim=moved_ids.length;
                while (i<lim) {
                    var addGlossmark=mB.UI.addGlossmark;
                    var id=moved_ids[i++];
                    var glosses=mB.glossdb.find('frag',id);
                    if (!((glosses)&&(glosses.length))) continue;
                    var j=0, jlim=glosses.length; while (j<jlim) {
                        var gloss=mB.glossdb.probe(glosses[j++]);
                        if (gloss) {
                            var nodes=mB.getDups(gloss.frag);
                            addClass(nodes,"glossed");
                            var k=0, klim=nodes.length; while (k<klim) {
                                addGlossmark(nodes[k++],gloss);}}}}
                if (Trace.startup)
                    fdjtLog("Finished adding glossmarks to saved layout");
                setupPagebar();
                if (mB.layoutdone) {
                    var fn=mB.layoutdone;
                    mB.layoutdone=false;
                    fn();}
                Timeline.layout_complete=fdjtTime();
                if (mB.state)
                    mB.restoreState(mB.state,"layoutRestored");
                mB.layout.running=false;

                return false;}
            
            var max_layouts=3;

            function recordLayout(layout_id,source_id){
                var key="mB("+source_id+").layouts";
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

            function finishPageInfo(page,layout){
                var pages=layout.pages, pagenum=atoi(page.getAttribute("data-pagenum"),10);
                var docinfo=mB.docinfo, curloc=false;
                var lastid=getPageLastID(page);
                var prevpage=
                    (((pagenum)&&(pagenum>1))&&(pages[pagenum-2]));
                if (lastid) page.setAttribute("data-lastid",lastid);
                if ((!(page.getAttribute("data-mbloc")))&&(prevpage)) {
                    var prevlast=prevpage.getAttribute("data-lastid");
                    var lastinfo=((prevlast)&&(docinfo[prevlast]));
                    if (lastinfo) {
                        curloc=lastinfo.starts_at;
                        page.setAttribute("data-mbloc",lastinfo.ends_at);}
                    else {
                        var prevoff=prevpage.getAttribute("data-mbloc");
                        if (prevoff)
                            page.setAttribute("data-mbloc",prevoff);
                        else page.setAttribute("data-mbloc","0");}}}

            function getPageLastID(node,id) {
                if (hasClass(node,"codexpage")) {}
                else if ((node.id)&&(!(node.codexbaseid))&&
                         (mB.docinfo[node.id]))
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

            var images_count=0, images_loaded=0, images_failed=0;
            function get_image_donefn(whenready){
                function image_loaded(evt){
                    var target=fdjt.UI.T(evt);
                    target.onload=false; target.onerror=false;
                    if (evt.type==="load")
                        images_loaded++;
                    else images_failed++;
                    if (target.parentElement)
                        target.parentElement.removeChild(target);
                    if ((images_loaded+images_failed)>=images_count) {
                        Timeline.images_loaded=fdjtTime();
                        whenready();}}
                return image_loaded;}

            function body_wait(content,whenready){
                if (!(content))
                    content=mB.content||document.body;
                if (Timeline.dom_ready)
                    return whenready();
                else {
                    var images=fdjtDOM.getChildren(content,"IMG");
                    var donefn=get_image_donefn(whenready);
                    if ((images)&&(images.length)) {
                        var dups=[];
                        var i=0, n_imgs=images.length;
                        while (i<n_imgs) {
                            var img=images[i++];
                            if (img.src) {
                                var dup=fdjtDOM("IMG");
                                dup.src=img.src;
                                dup.onload=dup.onerror=donefn;
                                dup.style.display='none';
                                dups.push(dup);}}
                        if (dups.length===0)
                            return whenready();
                        images_count=dups.length;
                        var body=document.body;
                        var j=0, n_dups=dups.length;
                        while (j<n_dups) 
                            body.appendChild(dups[j++]);}}}

            function new_layout(){
                // Prepare to do the layout
                dropClass(document.body,"_SCROLL");
                addClass(document.body,"_BYPAGE");
                layoutWait();
                // This keeps the page content hidden during layout
                // $ID("CODEXPAGE").style.visibility='hidden';
                // This shouldn't be neccessary because CODEXCONTENT 
                //  should have display:none with body._BYPAGE.
                //$ID("CODEXCONTENT").style.visibility='hidden';
                
                // Now make the content (temporarily) the same width as
                // the page
                var saved_width=mB.content.style.width;
                mB.content.style.width=
                    getGeometry(mB.page).width+"px";
                
                // Now walk the content
                var content=mB.content;
                var roots=toArray(content.childNodes);
                fdjtLog("Laying out %d root nodes into %dx%d pages (%s), id=%s, async=%s",
                        roots.length,layout.width,layout.height,
                        (why||""),layout_id,
                        ((!(timeslice))?("no"):(fdjtString("%d(%d)",timeslice,timeskip))));
                
                layoutMessage("Starting new layout",0);
                
                // Do the adjust font bit.  We rely on mB.content
                //  having the same width as mB.page
                fdjt.DOM.adjustFonts(content);
                
                // Now reset the width
                mB.content.style.width=saved_width;

                var root_i=0; var n_roots=roots.length;
                function rootloop(){
                    if (root_i>=n_roots) {
                        layout.Finish();
                        layout_progress(layout);
                        var pages=layout.pages;
                        var i=0, n=pages.length; while (i<n)
                            finishPageInfo(pages[i++],layout);
                        Timeline.layout_done=fdjtTime();
                        var cachethresh=mB.cache_layout_thresh;
                        if (cachethresh) {
                            var elapsed=layout.done-layout.started;
                            if ((typeof cachethresh === "number")?
                                (elapsed>cachethresh):(elapsed>5000)) {
                                layout.saveLayout(function layoutSaved(l){
                                    recordLayout(l.layout_id,mB.sourceid);});}}
                        $ID("CODEXPAGE").style.visibility='';
                        $ID("CODEXCONTENT").style.visibility='';
                        dropClass(document.body,"mbLAYOUT");
                        mB.layout=layout;
                        mB.pagecount=layout.pages.length;
                        setupPagebar();
                        stopLayoutWait();
                        if (mB.layoutdone) {
                            var fn=mB.layoutdone;
                            mB.layoutdone=false;
                            fn();}
                        if ((mB.state)&&((layout_waiting)||(!(mB.curpage)))) {
                            var state=mB.state;
                            var targetid=state.target||state.hash;
                            mB.GoTo(state.location||state.target||state.hash,
                                    "layoutDone",targetid&&mbID(targetid),
                                    false,true);}
                        mB.layout.running=false;
                        if (async) setTimeout(checkLayout,100);
                        return false;}
                    else {
                        var root=roots[root_i++];
                        if (((root.nodeType===3)&&(!(isEmpty(root.nodeValue))))||
                            ((root.nodeType===1)&&
                             (root.tagName!=='LINK')&&(root.tagName!=='META')&&
                             (root.tagName!=='SCRIPT')&&(root.tagName!=='BASE'))) {
                            layout.addContent(root,timeslice,timeskip,
                                              layout.tracelevel,
                                              layout_progress,
                                              ((async)&&(rootloop)));}
                        else if (async) return rootloop();
                        else return true;}}
                
                if (async) rootloop();
                else {
                    var running=true;
                    while (running) running=rootloop();}}

            function start_new_layout(){
                Timeline.layout_started=fdjtTime();
                new_layout();}
            function request_layout(){
                if (!(Timeline.layout_requested))
                    Timeline.layout_requested=fdjtTime();
                body_wait(mB.content,start_new_layout);}
            
            if ((mB.cache_layout_thresh)&&
                (!((mB.forcelayout)))&&
                (!(forced))) {
                if (Trace.layout)
                    fdjtLog("Fetching layout %s",layout_id);
                CodexLayout.fetchLayout(layout_id).
                    then(function layoutFetched(content){
                        if (!(content)) return request_layout();
                        if (Trace.layout) fdjtLog("Got layout %s",layout_id);
                        recordLayout(layout_id,mB.sourceid);
                        try {
                            Timeline.layout_fetched=fdjtTime();
                            return restore_layout(content,layout_id);}
                        catch (ex) {
                            fdjtLog("Layout restore error: %o",ex);
                            request_layout();}})
                    .catch(function layoutNotFetched(){
                        request_layout();});}
            else request_layout();}
        metaBook.Paginate=Paginate;

        CodexLayout.prototype.onresize=function layoutOnResize(){
            if (mB.bypage) mB.Paginate("resize");
            else fdjt.DOM.adjustFonts(mB.content);};
        
        mB.addConfig(
            "layout",
            function(name,val){
                mB.page_style=val;
                if (val==='bypage') {
                    if (!(mB.docinfo)) {
                        // If there isn't any docinfo (during startup, for
                        // instance), don't bother actually paginating.
                        mB.bypage=true;}
                    else if (!(mB.bypage)) {
                        // set this
                        mB.bypage=true;
                        if (mB.postconfig)
                            // If we're in the middle of config,
                            // push off the work of paginating
                            mB.postconfig.push(Paginate);
                        // Otherwise, paginate away
                        else mB.Paginate("config");}}
                else {
                    // If you've already paginated, revert
                    if (mB.layout) {
                        mB.layout.Revert();
                        mB.layout=false;}
                    else if (((mB.layout)&&(!(mB.layout.done)))) {
                        if (mB.layout.timer) {
                            clearTimeout(mB.layout.timer);
                            mB.layout.timer=false;}
                        mB.layout.Revert();
                        mB.layout=false;}
                    mB.bypage=false;
                    if (mB.layout) {
                        mB.layout.Revert();
                        mB.layout=false;}
                    dropClass(document.body,"_BYPAGE");
                    addClass(document.body,"_SCROLL");
                    fdjt.DOM.adjustFonts(mB.content);}});

        function updateLayoutProperty(name,val){
            // This updates layout properties
            if (val===true) 
                fdjtDOM.addClass(mB.body,"metabook"+name);
            else if (!(val))
                fdjtDOM.dropClass(
                    mB.body,new RegExp("metabook"+name+"\\w*"));
            else fdjtDOM.swapClass(
                mB.body,new RegExp("metabook"+name+"\\w*"),
                "metabook"+name+val);
            metaBook[name]=val;
            if ((mB.postconfig)&&(mB.content)) {
                if (mB.postconfig.indexOf(mB.sizeContent)<0)
                    mB.sized=false;
                mB.postconfig.push(mB.sizeContent);}
            else if (mB.content) mB.sizeContent();
            if (mB.layout) {
                // If you're already paginated, repaginate.  Either
                // when done with the config or immediately.
                if (mB.postconfig) {
                    mB.postconfig.push(function layoutOnProperty(){
                        mB.Paginate(name);});}
                else {
                    mB.Paginate(name);}}
            fdjt.Async(function layoutUpdateSettings(){
                mB.updateSettings(name,val);});}
        mB.addConfig("bodysize",updateLayoutProperty);
        mB.addConfig("bodyfamily",updateLayoutProperty);
        mB.addConfig("bodyspacing",updateLayoutProperty);
        mB.addConfig("textjustify",updateLayoutProperty);
        
        function getLayoutID(width,height,family,size,spacing,
                             justify,source_id){
            var page=$ID("CODEXPAGE");
            var left=page.style.left, right=page.style.right;
            var docref=mB.docref, sourceid=mB.sourceid;
            var sourcehash=fdjt.CodexLayout.sourcehash;
            page.style.left=""; page.style.right="";
            if (!(width))
                width=getGeometry(page,false,true).width;
            if (!(height))
                height=getGeometry($ID("CODEXPAGE"),false,true).inner_height;
            if (!(size)) size=mB.bodysize||"normal";
            if (!(source_id))
                source_id=mB.sourceid||fdjtHash.hex_md5(mB.docuri);
            if (!(justify)) justify=mB.textjustify;
            if (!(spacing)) spacing=mB.linespacing;
            page.style.left=left; page.style.right=right;
            return fdjtString(
                "%s%dx%d-%s-%s%s%s%s%s",
                ((docref)?(docref+":"):("")),
                width,height,family,size,
                ((justify)?("-j"):("")),
                ((spacing)?("-l"+spacing):("")),
                // Layout depends on the actual file ID, if we've got
                // one, rather than just the REFURI
                ((sourceid)?("#"+sourceid):("")),
                ((sourcehash)?("/"+sourcehash):("")));}
        metaBook.getLayoutID=getLayoutID;

        function layoutCached(layout_id){
            if (!(layout_id)) layout_id=getLayoutID();
            else if (typeof layout_id === "number")
                layout_id=getLayoutID.apply(null,arguments);
            else {}
            var layouts=getLocal("mB("+mB.sourceid+").layouts",true);
            return ((layouts)&&(layouts.indexOf(layout_id)>=0));}
        metaBook.layoutCached=layoutCached;
        
        function clearLayouts(source_id){
            if (typeof source_id === "undefined")
                source_id=mB.sourceid;
            if (source_id) {
                var layouts=getLocal("mB("+source_id+").layouts",true);
                var i=0, lim=layouts.length; while (i<lim) {
                    var layout=layouts[i++];
                    fdjtLog("Dropping layout %s",layout);
                    CodexLayout.dropLayout(layout);}
                fdjtState.dropLocal("mB("+source_id+").layouts");}
            else {
                CodexLayout.clearLayouts();
                CodexLayout.clearAll();
                fdjtState.dropLocal(/^mB.layouts\(/g);}}
        metaBook.clearLayouts=clearLayouts;

        function getLayoutArgs(){
            var width=getGeometry($ID("CODEXPAGE"),false,true).width;
            var height=getGeometry($ID("CODEXPAGE"),false,true).inner_height;
            var origin=fdjtDOM("div#CODEXCONTENT");
            var container=fdjtDOM("div.metabookpages#METABOOKPAGES");
            var bodyfamily=(mB.dyslexical)?("opendyslexic"):
                (mB.bodyfamily||"default");
            var bodysize=mB.bodysize||"normal";
            var docref=mB.docref;
            var sourceid=mB.sourceid;
            var justify=mB.textjustify;
            var spacing=mB.linespacing;
            var sourcehash=fdjt.CodexLayout.sourcehash;
            var layout_id=fdjtString(
                "%s%dx%d-%s-%s%s%s%s%s",
                ((docref)?(docref+":"):("")),
                width,height,bodyfamily,bodysize,
                ((justify)?("-j"):("")),
                ((spacing)?("-l"+spacing):("")),
                // Layout depends on the actual file ID, if we've got
                // one, rather than just the REFURI
                ((sourceid)?("#"+sourceid):("")),
                ((sourcehash)?("/"+sourcehash):("")));

            var docinfo=mB.docinfo;
            var getChild=fdjtDOM.getChild;
            var stripMarkup=fdjtString.stripMarkup;

            function finishedPage(page,layout){
                var pages=layout.pages, pagenum=layout.pagenum;
                var topnode=getPageTop(page);
                var topid=topnode.codexbaseid||topnode.id;
                var prevpage=(((pagenum)&&(pagenum>1))&&(pages[pagenum-2]));
                var staticref=getChild(page,".staticpageref");
                var curloc=false;
                if (staticref) {
                    var pageref=staticref.getAttribute("data-pageref");
                    if (!(pageref)) pageref=stripMarkup(staticref.innerHTML);
                    if (pageref) {
                        if (!(layout.pagemap)) layout.pagemap={};
                        page.setAttribute("data-staticpageref",pageref);
                        if (!(layout.pagemap[pageref]))
                            layout.laststaticref=pageref;
                        layout.pagemap[pageref]=page;}}
                else if (prevpage) {
                    var prevref=prevpage.getAttribute("data-staticpageref");
                    if (prevref)
                        page.setAttribute("data-staticpageref",prevref);}
                if (topnode) {
                    var topstart=mbID(topid);
                    var locoff=((topstart===topnode)?(0):
                                (getLocOff(pages,topstart,topnode)));
                    var info=docinfo[topid];
                    curloc=info.starts_at+locoff;
                    if (topid) page.setAttribute("data-topid",topid);
                    page.setAttribute("data-mbloc",curloc);}
                if ((mB.state)&&(layout_waiting)) {
                    var state=mB.state, target=state.target, loc=state.location;
                    var resolved=(target)?(getPage(target,loc)):
                        ((curloc)&&(loc<curloc)&&(loc2page(loc,layout)));
                    if (Trace.layout) fdjtLog("Checking state %j, resolved=%o",state,resolved);
                    if (resolved) {
                        stopLayoutWait();
                        fdjtAsync(function(){
                            mB.GoToPage(resolved,"partial_layout",false);});}}}
            
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
                fdjtState.getLocal("mB("+mB.docid+").sourceid");
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
                fdjtState.setLocal("mB("+mB.docid+").sourceid",sourceid);
            
            var args={page_height: height,page_width: width,
                      orientation: fdjtDOM.getOrientation(window),
                      // Include this line to disable timeslicing
                      //  of layout (can help with debugging)
                      // timeslice: false,timeskip: false,
                      container: container,origin: origin,
                      pagerule: mB.CSS.pagerule,
                      tracelevel: Trace.layout,
                      layout_id: layout_id,
                      pagefn: finishedPage,
                      logfn: fdjtLog};
            fdjtDOM.replace("METABOOKPAGES",container);
            metaBook.pages=container;
            
            var fbb=getMeta("alwaysbreakbefore",true,true).
                concat(getMeta("forcebreakbefore",true,true));
            if ((fbb)&&(fbb.length)) args.forcebreakbefore=fdjtDOM.sel(fbb);

            var fba=getMeta("alwaysbreakafter",true,true)
                .concat(getMeta("forcebreakafter",true,true));
            if ((fba)&&(fba.length)) args.forcebreakafter=fdjtDOM.sel(fba);
            
            var abb=getMeta("avoidbreakbefore",true,true)
                .concat(getMeta("dontbreakbefore",true,true));
            if ((abb)&&(abb.length)) args.avoidbreakbefore=fdjtDOM.sel(abb);

            var aba=getMeta("avoidbreakafter",true,true)
                 .concat(getMeta("dontbreakafter",true,true));
            if ((aba)&&(aba.length)) args.avoidbreakafter=fdjtDOM.sel(aba);
            
            var abi=getMeta("avoidbreakinside",true,true).
                concat(getMeta("dontbreakinside",true,true));
            if ((abi)&&(abi.length)) args.avoidbreakinside=abi;

            var fullpages=[".sbookfullpage",".sbooktitlepage",".sbookpage"].
                concat(getMeta("codexfullpage",true));
            args.fullpages=fdjtDOM.sel(fullpages);
            
            var floatpages=[".codexfloatpage"].concat(
                getMeta("codexfloatpage",true));
            if ((floatpages)&&(floatpages.length))
                args.floatpages=fdjtDOM.sel(floatpages);
            
            var floating=[".codexfloating",".codexfloat"].concat(
                getMeta("codexfloat",true)).concat(
                    getMeta("codexfloating",true));
            if ((floating)&&(floating.length))
                args.floating=fdjtDOM.sel(floating);

            if ((getMeta("metaBook.dontbreakblocks"))||
                (getMeta("metaBook.keepblocks"))||
                (getMeta("~=metaBook.dontbreakblocks"))||
                (getMeta("~=metaBook.keepblocks"))||
                (getMeta("~dontbreakblocks"))||
                (getMeta("~keepblocks")))
                args.break_blocks=false;
            else args.break_blocks=true;
            
            if ((getMeta("metaBook.dontscalepages"))||
                (getMeta("~=metaBook.dontscalepages"))||
                (getMeta("dontscalepages")))
                args.scale_pages=false;
            else args.scale_pages=true;

            args.dontsave=fdjt.DOM.Selector(".glossmark");
            
            return args;}
        CodexLayout.getLayoutArgs=getLayoutArgs;

        function sizeCodexPage(){
            var page=mB.page, geom=getGeometry(page);
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
            if (page_vmargin<80) mB.fullheight=true;
            else mB.fullheight=false;
            if (page_hmargin<80) mB.fullwidth=true;
            else mB.fullwidth=false;
            if (mB.fullwidth) addClass(document.body,"_FULLWIDTH");
            else dropClass(document.body,"_FULLWIDTH");
            if (mB.fullheight) addClass(document.body,"_FULLHEIGHT");
            else dropClass(document.body,"_FULLHEIGHT");}
        metaBook.sizeCodexPage=sizeCodexPage;
        
        function scaleLayout(flag){
            // This adjusts to a resize by just scaling (using CSS
            // transforms) the current layout.
            var cheaprule=mB.CSS.resizerule;
            if (typeof flag==="undefined") flag=true;
            if ((flag)&&(hasClass(document.body,"_SCALEDLAYOUT"))) return;
            if ((!(flag))&&(!(hasClass(document.body,"_SCALEDLAYOUT")))) return;
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
            var layout=mB.layout;
            var geom=getGeometry($ID("CODEXPAGE"),false,true);
            var width=geom.width, height=geom.inner_height;
            var lwidth=layout.width, lheight=layout.height;
            var hscale=height/lheight, vscale=width/lwidth;
            var scale=((hscale<vscale)?(hscale):(vscale));
            if (!(cheaprule)) {
                var s="#CODEXPAGE div.codexpage";
                mB.CSS.resizerule=cheaprule=fdjtDOM.addCSSRule(
                    s+", body._ANIMATE.mbPREVIEW "+s,"");}
            cheaprule.style[fdjtDOM.transformOrigin]="left top";
            cheaprule.style[fdjtDOM.transform]=
                "scale("+scale+","+scale+") translateZ(0)";
            var nwidth=lwidth*scale, nheight=lheight*scale;
            // If the width has shrunk (it can't have grown), that means
            //  that there is an additional left margin, so we move the page
            //  over to the left
            if (nwidth<width)
                cheaprule.style.left=((width-nwidth)/2)+"px";
            if (nheight<height) cheaprule.style.top="0px";
            var n=mB.pagecount;
            var spanwidth=($ID("METABOOKPAGEBAR").offsetWidth)/n;
            if (spanwidth<1) spanwidth=1;
            if (mB.CSS.pagespanrule)
                mB.CSS.pagespanrule.style.width=spanwidth+"px";
            else mB.CSS.pagespanrule=fdjtDOM.addCSSRule(
                "div.metabookpagespans > span","width: "+spanwidth+"px;");
            addClass(document.body,"_SCALEDLAYOUT");}
        metaBook.scaleLayout=scaleLayout;
        
        /* Updating the page display */

        function updatePageDisplay(pagenum,staticref,location,eltid) {
            var update_progress=(!(eltid));
            if (!(eltid)) eltid="METABOOKCURPAGESPAN";
            var npages=mB.pagecount;
            var staticmax=mB.layout.laststaticref;
            var showpage_elt=$ID(eltid);
            var locoff;
            if (typeof location==='number') {
                var max_loc=mB.ends_at;
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
            if (showpage_elt) {
                showpage_elt.innerHTML=pagenum;
                showpage_elt.style.left=((100*(pagenum-1))/npages)+"%";}
            var pageno_text=fdjtDOM(
                "span#METABOOKPAGENOTEXT.metabookpageno",pagenum,"/",npages);
            pageno_text.title="select to change page number";
            fdjtDOM.replace("METABOOKPAGENOTEXT",pageno_text);
            var pageref_text=
                ((staticref)&&(staticmax)&&
                 (fdjtDOM("span#METABOOKPAGEREFTEXT.metabookpageno",
                          staticref+"("+staticmax+")")));
            if (pageref_text) {
                pageref_text.title=
                    "Reference page number (from some print version)"; 
                fdjtDOM.replace("METABOOKPAGEREFTEXT",pageref_text);}
            fdjtDOM.replace("METABOOKLOCPCT",locoff);
            locoff.title=
                ((locoff.title)||"")+
                ((locoff.title)?("; "):(""))+
                " select to change %";
            if (update_progress) {
                var page_progress=$ID("METABOOKPAGEPROGRESS");
                if (page_progress) page_progress.style.width=
                    (((pagenum-1)*100)/npages)+"%";}
            if (update_progress) {
                /* Update section markers */
                var page=$ID("CODEXPAGE"+pagenum);
                var topid=(page)&&page.getAttribute("data-topid");
                var info=(topid)&&mB.docinfo[topid];
                if (info) {
                    var head1=((info.level)?(info):(info.head));
                    var head2=((head1)&&(head1.head));
                    var head3=((head2)&&(head2.head));
                    var range1=getpagerange(head1);
                    var range2=getpagerange(head2);
                    var range3=getpagerange(head3);
                    while ((range3)&&(range2)&&(range1.width<=1)) {
                        var nextspan=(head3.head)&&(getpagerange(head3.head));
                        if (!(nextspan)) break;
                        head1=head2; head2=head3; head3=head3.head;
                        range1=range2; range2=range3; range3=nextspan;}
                    var marker1=$ID("METABOOKSECTMARKER1");
                    var marker2=$ID("METABOOKSECTMARKER2");
                    var marker3=$ID("METABOOKSECTMARKER3");
                    if ((range1)&&(range1.width)) {
                        marker1.style.left=(100*((range1.start-1)/npages))+"%";
                        marker1.style.width=(100*(range1.width/npages))+"%";
                        marker1.style.display='block';                    }
                    else marker1.style.display='none';
                    if ((range2)&&(range2.width)) {
                        marker2.style.left=(100*((range2.start-1)/npages))+"%";
                        marker2.style.width=(100*(range2.width/npages))+"%";
                        marker2.style.display='block';}
                    else marker2.style.display='none';
                    if ((range3)&&(range3.width)) {
                        marker3.style.left=(100*((range3.start-1)/npages))+"%";
                        marker3.style.width=(100*(range3.width/npages))+"%";
                        marker3.style.display='block';                    }
                    else marker3.style.display='none';}}
            var handlers=mB.UI.handlers[mB.ui];
            fdjtDOM.addListeners(locoff,handlers["#METABOOKLOCPCT"]);
            fdjtDOM.addListeners(
                pageno_text,handlers["#METABOOKPAGENOTEXT"]);
            if (pageref_text) fdjtDOM.addListeners(
                pageref_text,handlers["#METABOOKPAGEREFTEXT"]);}
        metaBook.updatePageDisplay=updatePageDisplay;
        
        function getpagerange(headinfo) {
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
            if (!(result.end)) result.end=mB.layout.pages.length+1;
            result.width=result.end-result.start;
            return result;}

        /* Page info */
        
        function setupPagebar(){
            var layout=mB.layout, pages=layout.pages;
            var i=0, n=pages.length;
            var pagemax=$ID("METABOOKGOTOPAGEMAX");
            if (pagemax) pagemax.innerHTML=""+n;
            var spanwidth=
                ($ID("METABOOKPAGEBAR").offsetWidth)/n;
            if (spanwidth<1) spanwidth=1;
            if (mB.CSS.pagespanrule)
                mB.CSS.pagespanrule.style.width=spanwidth+"px";
            else mB.CSS.pagespanrule=fdjtDOM.addCSSRule(
                "div.metabookpagespan","width: "+spanwidth+"px;");
            while (i<n) {
                var page=pages[i];
                var pageref=page.getAttribute("data-staticpageref");
                if (pageref) {
                    var pagemap=layout.pagemap;
                    var pagerefmax=$ID("METABOOKGOTOPAGEREFMAX");
                    if (pagerefmax) pagerefmax.innerHTML=""+pageref;
                    if (!(pagemap)) layout.pagemap=pagemap={};
                    layout.laststaticref=pageref;
                    pagemap[pageref]=page;}
                i++;}
            if (layout.laststaticref)
                addClass(document.body,"mbPAGEREFS");
            else dropClass(document.body,"mbPAGEREFS");}
        metaBook.setupPagebar=setupPagebar;


        function getDups(id){
            if (!(id)) return false;
            else if (typeof id === "string") {
                if ((mB.layout)&&(mB.layout.dups)) {
                    var dups=mB.layout.dups;
                    var d=dups[id];
                    if (d) return [mbID(id)].concat(d);
                    else return [mbID(id)];}
                else return [mbID(id)];}
            else return getDups(id.codexbaseid||id.id);}
        metaBook.getDups=getDups;

        /* Movement by pages */
        
        var curpage=false;
        
        function GoToPage(spec,caller,savestate,skiphist){
            if (typeof savestate === 'undefined') savestate=true;

            if (mB.previewing) mB.stopPreview("GoToPage",false);
            dropClass(document.body,"mbSHOWHELP");
            mB.clearGlossmark();
            
            var page=(mB.layout)&&
                (mB.layout.getPage(spec)||mB.layout.getPage(1));
            if (!(page)) return;
            else if (page===curpage) return;
            else {
                var pagenum=parseInt(page.getAttribute("data-pagenum"),10);
                var dirclass=false;
                if (mB.mode==="addgloss") mB.setMode(false,false);
                if (savestate) mB.clearStateDialog();
                if (Trace.flips)
                    fdjtLog("GoToPage/%s Flipping to %o (%d) for %o",
                            caller,page,pagenum,spec);
                // Clean up any inconsistent curpage settings
                if (!(curpage)) {
                    var curpages=mB.pages.getElementsByClassName(
                        'curpage');
                    if (curpages.length)
                        dropClass(toArray(curpages),"curpage");
                    addClass(page,"curpage");}
                else if ((mB.dontanimate)||
                         (!(hasClass(document.body,"_ANIMATE")))) {
                    dropClass(curpage,"curpage");
                    addClass(page,"curpage");}
                else {
                    var curpagestring=curpage.getAttribute("data-pagenum");
                    var curnum=parseInt(curpagestring,10);
                    // This does the page flip animation;
                    dropClass(curpage,/\b(oldpage|newpage|onleft|onright)\b/g);
                    dropClass(page,/\b(oldpage|newpage|onleft|onright)\b/g);
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
                            mB.pages.getElementsByClassName('curpage');
                        if (whoops.length) dropClass(toArray(whoops),"curpage");
                        dropClass(lastpage,"curpage");
                        addClass(page,"curpage");
                        dropClass(page,"newpage");
                        dropClass(page,/\bon(right|left)\b/);},
                               50);
                    setTimeout(function(){
                        dropClass(lastpage,"oldpage");},
                               500);}
                if (typeof spec === 'number') {
                    var locval=page.getAttribute("data-mbloc");
                    var location=((locval)&&(parseInt(locval,10)));
                    if (location) mB.setLocation(location);}
                var staticref=page.getAttribute("data-staticpageref");
                updatePageDisplay(pagenum,staticref,mB.location);
                curpage=page; mB.curpage=pagenum;
                var curnode=mbID(page.getAttribute("data-lastid"))||
                    mbID(page.getAttribute("data-topid"));
                if (curnode) mB.setHead(curnode);
                if (savestate) {
                    mB.point=curnode;
                    if (!((mB.hudup)||(mB.mode)))
                        mB.skimpoint=false;}
                if ((savestate)&&(page)) {
                    var loc=page.getAttribute("data-mbloc");
                    var pageno=page.getAttribute("data-pagenum");
                    mB.saveState(
                        {location: atoi(loc,10),
                         page: atoi(pageno,10),
                         target: ((curnode)&&
                                  ((curnode.getAttribute("data-baseid"))||
                                   (curnode.id)))},
                        skiphist);}
                var glossed=fdjtDOM.$(".glossed",page);
                if (glossed) {
                    var addGlossmark=mB.UI.addGlossmark;
                    var i=0; var lim=glossed.length;
                    while (i<lim) addGlossmark(glossed[i++]);}}}
        metaBook.GoToPage=GoToPage;
        

        /** Previewing **/

        var previewing=false;
        function startPagePreview(spec,caller){
            var page=((spec.nodeType)&&(getParent(spec,".codexpage")))||
                mB.layout.getPage(spec)||
                mB.layout.getPage(1);
            if ((Trace.preview)||(Trace.flips)) {
                fdjtLog("startPagePreview for %o from %s",page,spec);}
            if (!(page)) return;
            var pagenum=parseInt(page.getAttribute("data-pagenum"),10);
            var pageloc=parseInt(page.getAttribute("data-mbloc"),10);
            if (previewing===page) return;
            if (previewing) dropClass(previewing,"previewpage");
            dropClass(getChildren(mB.pages,".previewpage"),
                      "previewpage");
            if ((Trace.flips)||(Trace.gestures))
                fdjtLog("startPagePreview/%s to %o (%d) for %o",
                        caller||"nocaller",page,pagenum,spec);
            if (curpage) addClass(curpage,"hidepage");
            addClass(page,"previewpage");
            mB.previewing=previewing=page;
            addClass(document.body,"mbPREVIEW");
            var staticref=page.getAttribute("data-staticpageref");
            updatePageDisplay(pagenum,staticref,pageloc,"METABOOKPRVPAGESPAN");}
        metaBook.startPagePreview=startPagePreview;
        function stopPagePreview(caller,target){
            var pagenum=parseInt(curpage.getAttribute("data-pagenum"),10);
            if ((Trace.flips)||(Trace.gestures))
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
            dropClass(getChildren(mB.pages,".previewpage"),
                      "previewpage");
            mB.previewing=previewing=false;
            dropClass(document.body,"mbPREVIEW");
            dropClass(document.body,"mbPAGEPREVIEW");
            if (newpage) {
                var newnum=parseInt(newpage.getAttribute("data-pagenum"),10);
                var newloc=mB.getLocInfo(target);
                updatePageDisplay(
                    newnum,newpage.getAttribute("data-staticpageref"),
                    ((newloc)&&(newloc.starts_at)));}
            else updatePageDisplay(
                pagenum,curpage.getAttribute("data-staticpageref"),
                mB.location);
            if (typeof newpage === "number") mB.GoToPage(newpage);}
        metaBook.stopPagePreview=stopPagePreview;
        
        function getPage(arg,location,layout){
            if (!(layout)) layout=mB.layout;
            var node=((arg)&&
                      ((arg.nodeType)?(arg):
                       (typeof arg === "string")?(mbID(arg)):
                       (false)));
            var page=((node)&&(getParent(node,".codexpage")));
            if ((page)&&(layout.pages.indexOf(page)<0)) page=false;
            if (!(location)) return page;
            else if (page) {}
            else page=layout.pages[0];
            var loc=(page)?(parseInt(page.getAttribute("data-mbloc"),10)):-1;
            if (loc===location) return page;
            var pages=layout.pages, npages=pages.length;
            var i=((page)?
                   (parseInt(page.getAttribute("data-pagenum"),10)):
                   (1)); i--;
            var prev=page; while (i<npages) {
                var next=pages[i++];
                loc=parseInt(next.getAttribute("data-mbloc"),10);
                if (typeof loc !== "number") return prev;
                else if (loc===location) return next;
                else if (loc>location) return prev;
                else prev=next;}
            return page;}
        metaBook.getPage=getPage;
        
        function loc2page(loc,layout){
            var pages=layout.pages, n=pages.length-1, i=n;
            while (i>=0) {
                var page=pages[i], mbloc=page.getAttribute("data-mbloc");
                if (mbloc) mbloc=parseInt(mbloc);
                if (loc===mbloc) return page;
                else if (loc<mbloc) i--;
                else if (i===n) return false;
                else return page[n+1];}
            return false;}

        function refreshLayout(why,slice,skip){
            var opts={forced: true};
            if (slice) opts.timeslice=slice;
            if (skip) opts.timeskip=skip;
            mB.Paginate(why||"refreshLayout",opts);}
        metaBook.refreshLayout=refreshLayout;
        
        function syncLayout(why){
            mB.Paginate(why,{forced: true,timeslice: false});}
        metaBook.syncLayout=syncLayout;

        function checkLayout(){
            if (mB.layout.running) return;
            var geom=getGeometry($ID("CODEXPAGE"),false,true);
            var height=geom.inner_height, width=geom.width;
            if ((mB.layout.height===height)&&
                (mB.layout.width===width))
                return;
            else refreshLayout("checkLayout");}

        function displaySync(){
            if ((mB.pagecount)&&(mB.curpage))
                mB.GoToPage(mB.curpage,"displaySync",false);}
        metaBook.displaySync=displaySync;

        return Paginate;})();

/* Emacs local variables
   ;;;  Local variables: ***
   ;;;  compile-command: "cd ..; make" ***
   ;;;  indent-tabs-mode: nil ***
   ;;;  End: ***
*/
