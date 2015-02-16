/* -*- Mode: Javascript; Character-encoding: utf-8; -*- */

/* ###################### metabook/tagindex.js ###################### */

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

// tagindex.js
(function (){
    "use strict";
    var fdjtDOM=fdjt.DOM, fdjtLog=fdjt.Log, fdjtID=fdjt.ID;
    var fdjtTime=fdjt.Time, fdjtString=fdjt.String, fdjtUI=fdjt.UI;
    var dropClass=fdjtDOM.dropClass, addClass=fdjtDOM.addClass;
    var getLink=fdjtDOM.getLink, isEmpty=fdjtString.isEmpty;

    var mB=metaBook, Trace=mB.Trace;

    /* Indexing tags */
    
    function handlePublisherIndex(pubindex,whendone){
        if (!(pubindex))
            pubindex=metaBook._publisher_index||window._sbook_autoindex;
        if (!(pubindex)) {
            if (whendone) whendone();
            return;}
        if ((Trace.startup>1)||(Trace.indexing)) {
            if (pubindex._nkeys)
                fdjtLog("Processing provided index of %d keys and %d refs",
                        pubindex._nkeys,pubindex._nrefs);
            else fdjtLog("Processing provided index");}
        metaBook.useIndexData(pubindex,metaBook.knodule,false,whendone);}

    function indexingDone(){
        if ((Trace.indexing)||(Trace.startup))
            fdjtLog("Content indexing is completed");
        if (metaBook._setup) setupClouds();
        else metaBook.onsetup=setupClouds;}
    
    var cloud_setup_start=false;
    function setupClouds(){
        var tracelevel=Math.max(Trace.startup,Trace.clouds);
        var addTag2Cloud=metaBook.addTag2Cloud;
        var empty_cloud=metaBook.empty_cloud;
        var gloss_cloud=metaBook.gloss_cloud;
        var taglist=metaBook.taglist||fdjt.ID("METABOOKTAGLIST");
        if (!(taglist)) {
            taglist=metaBook.taglist=fdjt.DOM("datalist#METABOOKTAGLIST");
            document.body.appendChild(taglist);}
        var searchlist=metaBook.searchlist||fdjt.ID("METABOOKSEARCHLIST");
        if (!(searchlist)) {
            searchlist=metaBook.searchlist=fdjt.DOM("datalist#METABOOKSEARCHLIST");
            document.body.appendChild(searchlist);}
        var knodeToOption=Knodule.knodeToOption;

        cloud_setup_start=fdjtTime();
        metaBook.empty_query.results=
            [].concat(metaBook.glossdb.allrefs).concat(metaBook.docdb.allrefs);
        var searchtags=metaBook.searchtags=metaBook.empty_query.getCoTags();
        var empty_query=metaBook.empty_query;
        var tagfreqs=empty_query.tagfreqs;
        if (tracelevel)
            fdjtLog("Setting up initial tag clouds for %d tags",
                    searchtags.length);
        addClass(document.body,"mbINDEXING");
        fdjtDOM(empty_cloud.dom,
                fdjtDOM("div.cloudprogress","Cloud Shaping in Progress"));
        addClass(empty_cloud.dom,"working");
        fdjtDOM(gloss_cloud.dom,
                fdjtDOM("div.cloudprogress","Cloud Shaping in Progress"));
        addClass(gloss_cloud.dom,"working");
        fdjtTime.slowmap(function(tag){
            if (!(tag instanceof KNode)) {
                if ((typeof tag === "string")&&(!(isEmpty(tag)))) {
                    var option=fdjtDOM("OPTION",tag); option.value=tag;
                    searchlist.appendChild(option);}
                return;}
            var elt=addTag2Cloud(tag,empty_cloud,metaBook.knodule,
                                 tagfreqs,tagfreqs,false);
            // Ignore section name tags
            if (tag._id[0]==="\u00a7") return;
            taglist.appendChild(knodeToOption(tag));
            searchlist.appendChild(knodeToOption(tag));
            if (!(tag.weak)) {
                addClass(elt,"cue");
                addTag2Cloud(tag,gloss_cloud);}},
                         searchtags,
                         {watchfn: tagindex_progress,
                          done: tagindex_done,
                          slice: 200,space: 20});}
    
    function tagindex_done(searchtags){
        var eq=metaBook.empty_query;
        var empty_cloud=metaBook.empty_cloud;
        var gloss_cloud=metaBook.gloss_cloud;
        var searchlist=fdjt.ID("METABOOKSEARCHLIST");
        var knodeToOption=Knodule.knodeToOption;        
        
        if (Trace.startup>1)
            fdjtLog("Done populating clouds with %d tags",
                    searchtags.length);
        dropClass(document.body,"mbINDEXING");
        eq.cloud=empty_cloud;
        if (!(fdjtDOM.getChild(empty_cloud.dom,".showall")))
            fdjtDOM.prepend(empty_cloud.dom,
                            metaBook.UI.getShowAll(
                                true,empty_cloud.values.length));
        fdjtTime.slowmap(function(string){
            searchlist.appendChild(knodeToOption(string));},
                         metaBook.textindex.allterms,
                         {slice: 100,space: 20});
        metaBook.sortCloud(empty_cloud);
        metaBook.sortCloud(gloss_cloud);
        metaBook.sizeCloud(empty_cloud,metaBook.tagfreqs,[]);
        metaBook.sizeCloud(gloss_cloud,metaBook.tagfreqs,[]);}

    function tagindex_progress(state,i,lim){
        var tracelevel=Math.max(Trace.startup,Trace.clouds);
        var pct=((i*100)/lim);
        if (state!=='after') return;
        if (tracelevel>1)
            fdjtLog("Added %d (%d%% of %d tags) to clouds",
                    i,Math.floor(pct),lim);
        fdjtUI.ProgressBar.setProgress("METABOOKINDEXMESSAGE",pct);
        fdjtUI.ProgressBar.setMessage(
            "METABOOKINDEXMESSAGE",fdjtString(
                "Added %d tags (%d%% of %d) to clouds",
                i,Math.floor(pct),lim));}
    
    var addTags=metaBook.addTags;
    
    /* Using the autoindex generated during book building */
    function useIndexData(autoindex,knodule,baseweight,whendone){
        var ntags=0, nitems=0, handle_weak=false;
        var allterms=metaBook.allterms, prefixes=metaBook.prefixes;
        var tagweights=metaBook.tagweights;
        var maxweight=metaBook.tagmaxweight, minweight=metaBook.tagminweight;
        var tracelevel=Math.max(Trace.startup,Trace.indexing);
        var alltags=[];
        if (!(autoindex)) {
            if (whendone) whendone();
            return;}
        for (var tag in autoindex) {
            if (tag[0]==="_") continue;
            else if (!(autoindex.hasOwnProperty(tag))) continue;
            else alltags.push(tag);}
        // Number chosen to exclude exhaustive auto tags
        if (alltags.length<1000) handle_weak=true;
        function handleIndexEntry(tag){
            var ids=autoindex[tag]; ntags++;
            var occurrences=[];
            var bar=tag.indexOf('|'), tagstart=tag.search(/[^*~]/);
            var taghead=tag, tagterm=tag, knode=false, weight=false;
            if (bar>0) {
                taghead=tag.slice(0,bar);
                tagterm=tag.slice(tagstart,bar);}
            else tagterm=taghead=tag.slice(tagstart);
            if ((handle_weak)||(tag[0]!=='~'))
                knode=metaBook.knodule.handleSubjectEntry(tag);
            else knode=metaBook.knodule.probe(taghead)||
                metaBook.knodule.probe(tagterm);
            /* Track weights */
            if (knode) {
                weight=knode.weight;
                tagweights.set(knode,weight);}
            else if (bar>0) {
                var body=tag.slice(bar);
                var field_at=body.search("|:weight=");
                if (field_at>=0) {
                    var end=body.indexOf('|',field_at+1);
                    weight=((end>=0)?
                            (parseFloat(body.slice(field_at+9,end))):
                            (parseFloat(body.slice(field_at+9))));
                    tagweights.set(tagterm,weight);}}
            else {}
            if (weight>maxweight) maxweight=weight;
            if (weight<minweight) minweight=weight;
            if (!(knode)) {
                var prefix=((tagterm.length<3)?(tagterm):
                            (tagterm.slice(0,3)));
                allterms.push(tagterm);
                if (prefixes.hasOwnProperty(prefix))
                    prefixes[prefix].push(tagterm);
                else prefixes[prefix]=[tagterm];}
            var i=0; var lim=ids.length; nitems=nitems+lim;
            while (i<lim) {
                var idinfo=ids[i++];
                var frag=((typeof idinfo === 'string')?
                          (idinfo):
                          (idinfo[0]));
                var info=metaBook.docinfo[frag];
                // Pointer to non-existent node.  Warn here?
                if (!(info)) {
                    metaBook.missing_nodes.push(frag);
                    continue;}
                if (typeof idinfo !== 'string') {
                    // When the idinfo is an array, the first
                    // element is the id itself and the remaining
                    // elements are the text strings which are the
                    // basis for the tag (we use this for
                    // highlighting).
                    var knodeterms=info.knodeterms, terms;
                    var tagid=((knode)?(knode._qid):(tagterm));
                    // If it's the regular case, we just assume that
                    if (!(info.knodeterms)) {
                        knodeterms=info.knodeterms={};
                        knodeterms[tagid]=terms=[];}
                    else if ((terms=knodeterms[tagid])) {}
                    else knodeterms[tagid]=terms=[];
                    var j=1; var jlim=idinfo.length;
                    while (j<jlim) {terms.push(idinfo[j++]);}}
                occurrences.push(info);}
            addTags(occurrences,knode||taghead);}
        addClass(document.body,"mbINDEXING");
        fdjtTime.slowmap(
            handleIndexEntry,alltags,
            {watchfn: ((alltags.length>100)&&(tracelevel>1)&&(indexProgress)),
             done:
             function(state){
                fdjtLog("Book index links %d keys to %d refs",ntags,nitems);
                dropClass(document.body,"mbINDEXING");
                metaBook.tagmaxweight=maxweight;
                metaBook.tagminweight=minweight;
                if (whendone) return whendone();
                else return state;},
             slice: 200,space: 10});}
    metaBook.useIndexData=useIndexData;
    function indexProgress(state,i,lim){
        if (state!=='suspend') return;
        // For chunks:
        var pct=(i*100)/lim;
        fdjtLog("Processed %d/%d (%d%%) of provided tags",
                i,lim,Math.floor(pct));}
    
    /* Applying various tagging schemes */

    function applyMultiTagSpans() {
        var tags=fdjtDOM.$(".sbooktags");
        var i=0, lim=tags.length;
        while (i<lim) {
            var elt=tags[i++];
            var target=metaBook.getTarget(elt);
            var info=metaBook.docinfo[target.id];
            var tagtext=fdjtDOM.textify(elt);
            var tagsep=elt.getAttribute("tagsep")||";";
            var tagstrings=tagtext.split(tagsep);
            if (tagstrings.length) {
                var j=0, jlim=tagstrings.length;
                while (j<jlim) addTags(info,tagstrings[j++]);}}}
    function applyTagSpans() {
        var tags=fdjtDOM.$(".sbooktag");
        var i=0; var lim=tags.length;
        while (i<lim) {
            var tagelt=tags[i++];
            var target=metaBook.getTarget(tagelt);
            var info=metaBook.docinfo[target.id];
            var tagtext=fdjtDOM.textify(tagelt);
            addTags(info,tagtext);}}
    
    function applyAnchorTags() {
        var docinfo=metaBook.docinfo;
        var anchors=document.getElementsByTagName("A");
        if (!(anchors)) return;
        var i=0; var len=anchors.length;
        while (i<len) {
            if (anchors[i].rel==='tag') {
                var elt=anchors[i++];
                var cxt=elt;
                while (cxt) if (cxt.id) break; else cxt=cxt.parentNode;
                // Nowhere to store it?
                if (!(cxt)) return;
                var href=elt.href; var name=elt.name; var tag=false;
                if (name) { // DTerm style
                    var def=elt.getAttribute('data-def')||
                        elt.getAttribute('data-def');
                    var title=elt.title;
                    if (def) {
                        if (def[0]==='|') tag=tag+def;
                        else tag=tag+"|"+def;}
                    else if (title) {
                        if (title[0]==='|') tag=name+title;
                        else if (title.indexOf('|')>0) {
                            tag=name+"|"+title;}
                        else tag=name+"|~"+title;}
                    else tag=name;}
                else if (href) {
                    // Technorati style
                    var tagstart=(href.search(/[^\/]+$/));
                    tag=((tagstart<0)?(href):(href.slice(tagstart)));}
                else {}
                if (tag) {
                    var info=docinfo[cxt.id];
                    addTags(info,tag);}}
            else i++;}}
    
    /* Handling tag attributes */
    /* These are collected during the domscan; this is where the logic
       is implemented which applies header tags to section elements. */
    
    function applyTagAttributes(docinfo,whendone){
        var tracelevel=Math.max(Trace.startup,Trace.clouds);
        var tohandle=[]; var tagged=0;
        function index_progress(state,i,lim){
            // For chunks:
            if (!((state==='suspend')||(state==='finishing')))
                return;
            var pct=(i*100)/lim;
            if (tracelevel>1)
                fdjtLog("Processed %d/%d (%d%%) inline tags",
                        i,lim,Math.floor(pct));
            fdjtUI.ProgressBar.setProgress(
                "METABOOKINDEXMESSAGE",pct);
            fdjtUI.ProgressBar.setMessage(
                "METABOOKINDEXMESSAGE",
                fdjtString("Assimilated %d (%d%% of %d) inline tags",
                           i,Math.floor(pct),lim));}
        function index_done(){
            if (((Trace.indexing>1)&&(tohandle.length))||
                (tohandle.length>24))
                fdjtLog("Finished indexing tag attributes for %d nodes",
                        tohandle.length);
            if (whendone) whendone();}
        if ((Trace.startup>1)||(Trace.indexing>1))
            fdjtLog("Applying inline tag attributes from content");
        for (var eltid in docinfo) {
            var info=docinfo[eltid];
            if (info.atags) {tagged++; tohandle.push(info);}}
        if (((Trace.indexing)&&(tohandle.length))||
            (Trace.indexing>1)||(Trace.startup>1))
            fdjtLog("Indexing tag attributes for %d nodes",tohandle.length);
        fdjtTime.slowmap(
            handle_inline_tags,
            tohandle,
            {watchfn: ((tohandle.length>100)&&(index_progress)),
             done: index_done,slice: 200, space: 5});}
    metaBook.applyTagAttributes=applyTagAttributes;
    
    function handle_inline_tags(info){
        if (info.atags) addTags(info,info.atags);
        if (info.sectag) {
            addTags(info,info.sectag,"tags",metaBook.knodule);
            var knode=metaBook.knodule.ref(info.sectag);
            metaBook.tagweights.set(
                knode,metaBook.docdb.find('head',info).length);}}

    function setupIndex(metadata){
        if ((Trace.startup>1)||(Trace.indexing>1))
            fdjtLog("Finding and applying Technorati-style tags");
        applyAnchorTags();
        if ((Trace.startup>1)||(Trace.indexing>1))
            fdjtLog("Finding and applying tag elements from body");
        applyTagSpans();
        applyMultiTagSpans();
        applyTagAttributes(metadata);
        var pubindex=metaBook._publisher_index||
            window._sbook_autoindex;
        if (pubindex) {
            handlePublisherIndex(pubindex,indexingDone);
            metaBook._publisher_index=false;
            window._sbook_autoindex=false;}
        else if (fdjtID("SBOOKAUTOINDEX")) {
            var elt=fdjtID("SBOOKAUTOINDEX");
            fdjtDOM.addListener(elt,"load",function(evt){
                evt=evt||window.event;
                handlePublisherIndex(false,indexingDone);
                metaBook._publisher_index=false;
                window._sbook_autoindex=false;});}
        else {
            var indexref=getLink("SBOOKS.bookindex");
            if (indexref) {
                var script_elt=document.createElement("SCRIPT");
                script_elt.setAttribute("src",indexref);
                script_elt.setAttribute("language","javascript");
                script_elt.setAttribute("async","async");
                fdjtDOM.addListener(script_elt,"load",function(){
                    handlePublisherIndex(false,indexingDone);
                    metaBook._publisher_index=false;
                    window._sbook_autoindex=false;});
                document.body.appendChild(script_elt);}
            else indexingDone();}}
    metaBook.setupIndex=setupIndex;

})();

/* Emacs local variables
   ;;;  Local variables: ***
   ;;;  compile-command: "cd ..; make" ***
   ;;;  indent-tabs-mode: nil ***
   ;;;  End: ***
*/
