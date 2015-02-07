/* -*- Mode: Javascript; Character-encoding: utf-8; -*- */

/* ###################### metabook/search.js ###################### */

/* Copyright (C) 2009-2014 beingmeta, inc.

   This file implements the search component for the e-reader web
   application, and relies heavily on the Knodules module.

   This file is part of metaBook, a Javascript/DHTML web application for reading
   large structured documents (sBooks).

   For more information on sbooks, visit www.sbooks.net
   For more information on knodules, visit www.knodules.net
   For more information about beingmeta, visit www.beingmeta.com

   This library uses the FDJT (www.fdjt.org) toolkit.
   This file assumes that the sbooks.js file has already been loaded.

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
// var iScroll=((typeof iScroll !== "undefined")?(iScroll):({}));

(function(){
    "use strict";
    var mB=metaBook;
    var Trace=mB.Trace;
    var fdjtString=fdjt.String;
    var fdjtLog=fdjt.Log;
    var fdjtDOM=fdjt.DOM;
    var fdjtUI=fdjt.UI;
    var fdjtID=fdjt.ID;
    var RefDB=fdjt.RefDB, Query=RefDB.Query; 

    metaBook.search_cloud=false;
    if (!(metaBook.empty_cloud)) metaBook.empty_cloud=false;
    if (!(metaBook.show_refiners)) metaBook.show_refiners=25;
    if (!(metaBook.search_gotlucky)) metaBook.search_gotlucky=7;
    
    var addClass=fdjtDOM.addClass;
    var dropClass=fdjtDOM.dropClass;
    var getChild=fdjtDOM.getChild;
    var log=fdjtLog;
    var kbref=RefDB.resolve;

    /* Query functions */

    /* Set on main search input */
    // id="METABOOKSEARCHINPUT" 
    // completions="METABOOKSEARCHCLOUD"

    metaBook.getQuery=function(){return metaBook.query;};
    
    function setQuery(query){
        if (Trace.search) log("Setting working query to %o",query);
        var qstring=query.getString();
        if (qstring!==metaBook.qstring) {
            metaBook.query=query;
            metaBook.qstring=qstring;
            if (query.tags.length===0)  {
                addClass(metaBook.HUD,"emptysearch");
                metaBook.empty_cloud.dom.style.fontSize="";
                metaBook.search_cloud=metaBook.empty_cloud;}
            else {
                var cloud=metaBook.queryCloud(query);
                dropClass(metaBook.HUD,"emptysearch");
                fdjtDOM.replace("METABOOKSEARCHCLOUD",cloud.dom);
                metaBook.search_cloud=cloud;}
            useQuery(query,fdjtID("METABOOKSEARCH"));}
        if (metaBook.mode==="refinesearch") {
            if (query.results.length===0) {}
            else if (query.results.length<7)
                showSearchResults();
            else {fdjtID("METABOOKSEARCHINPUT").focus();}}}

    metaBook.setQuery=setQuery;

    function useQuery(query,box_arg){
        if (query instanceof Query) query=query;
        else query=new metaBook.Query(query);
        var qstring=query.getString();
        if ((box_arg)&&(typeof box_arg === 'string'))
            box_arg=document.getElementById(box_arg);
        var box=box_arg||query._box||fdjtID("METABOOKSEARCH");
        if ((query.dom)&&(box)&&(box!==query.dom))
            fdjtDOM.replace(box_arg,query.dom);
        box.setAttribute("qstring",qstring);
        query.execute();
        var cotags=query.getCoTags();
        var showtags=query.getRefiners();
        var input=getChild(box,".searchinput");
        var cloudid=input.getAttribute("completions");
        var infoid=input.getAttribute("info");
        var qtags=getChild(box,".qtags")||fdjtID("METABOOKSEARCHTAGS");
        var cloud=((cloudid)&&(fdjtID(cloudid)));
        /* These should possibly be used in initializing the .listing
         * field of the query */
        //var resultsid=input.getAttribute("results");
        //var results=((resultsid)&&(fdjtID(resultsid)));
        var info=((infoid)&&(fdjtID(infoid)));
        var resultcount=getChild(info,".resultcount");
        var refinecount=getChild(info,".refinecount");
        // Update (clear) the input field
        input.value='';
        var elts=query.tags; var i=0; var lim=elts.length;
        // Update 'notags' class
        if (elts.length) {
            fdjtDOM.dropClass(metaBook.HUD,"emptysearch");
            fdjtDOM.dropClass("METABOOKSEARCHINFO","notags");}
        else {
            addClass(metaBook.HUD,"emptysearch");
            fdjtDOM.dropClass("METABOOKSEARCHINFO","notags");}
        // Update the query tags
        var newtags=fdjtDOM("div.qtags");
        while (i<lim) {
            var tag=elts[i];
            if (typeof tag === 'string') tag=kbref(tag)||tag;
            var entry=metaBook.cloudEntry(tag,false,false,"span.qelt");
            entry.appendChild(fdjtDOM("span.redx","x"));
            fdjtDOM(newtags,((i>0)&&("\u00a0\u00B7 ")),entry);
            i++;}
        if (qtags.id) newtags.id=qtags.id;
        fdjtDOM.replace(qtags,newtags);
        // Update the results display
        if (query.results.length) {
            resultcount.innerHTML=query.results.length+
                " <br/>result"+((query.results.length===1)?"":"s");
            fdjtDOM.dropClass([box,info],"noresults");}
        else {
            resultcount.innerHTML="no results";
            addClass([box,info],"noresults");}
        // Tweak font size for qtags
        newtags.setAttribute("data-maxfont","120%");
        newtags.setAttribute("data-min","60%");
        fdjt.DOM.adjustFontSize(newtags);
        // Update the search cloud
        var n_refiners=((showtags)?(showtags.length):
                        (cotags)?(cotags.length):(0));
        var completions=metaBook.queryCloud(query);
        refinecount.innerHTML=n_refiners+" <br/>"+
            ((n_refiners===1)?("co-tag"):("co-tags"));
        fdjtDOM.dropClass(box,"norefiners");
        if (query.tags.length===0) {
            fdjtDOM.replace(
                "METABOOKSEARCHCLOUD",fdjtDOM("div#METABOOKSEARCHCLOUD"));
            metaBook.empty_cloud.dom.style.fontSize="";
            metaBook.empty_cloud.complete("");}
        else {
            if (cloudid) completions.id=cloudid;
            if (Trace.search>1)
                log("Setting search cloud for %o to %o",box,completions.dom);
            cloudid=cloud.id;
            addClass(completions.dom,"hudpanel");
            fdjtDOM.replace(cloud,completions.dom);
            completions.dom.style.fontSize="";
            completions.complete("",function(){
                metaBook.adjustCloudFont(completions);});}
        if (n_refiners===0) {
            addClass(box,"norefiners");
            refinecount.innerHTML="no refiners";}
        query._box=box; box.setAttribute("qstring",qstring);
        metaBook.UI.updateScroller(completions.dom);
        return query;}
    metaBook.useQuery=useQuery;

    var hasParent=fdjtDOM.hasParent;
    var getParent=fdjtDOM.hasParent;

    function searchTags_onclick(evt){
        var target=fdjtUI.T(evt);
        var onx=hasParent(target,".redx");
        var qelt=getParent(target,".qelt");
        if (!(qelt)) return; else fdjtUI.cancel(evt);
        var eltval=qelt.getAttribute("data-value"), elt;
        if (eltval.indexOf('@')>=0) elt=kbref(eltval)||eltval;
        if (Trace.gestures)
            fdjtLog("searchTags_ontap %o: %s%o",
                    evt,((onx)?("(onx) "):("")),
                    elt);
        var cur=[].concat(metaBook.query.tags);
        var splicepos=cur.indexOf(elt);
        if (splicepos<0) return;
        else cur.splice(splicepos,1);
        setQuery(new metaBook.Query(cur));
        fdjtUI.cancel(evt);}
    metaBook.searchTags_onclick=searchTags_onclick;

    function extendQuery(query,elt){
        var elts=[].concat(query.tags);
        if (typeof elt === 'string') {
            if (elt.indexOf('@')>=0) 
                elts.push(kbref(elt)||elt);
            else elts.push(elt);}
        else elts.push(elt);
        return useQuery(new metaBook.Query(elts),query._box);}
    metaBook.extendQuery=extendQuery;

    metaBook.updateQuery=function(input_elt){
        var q=Knodule.Query.string2query(input_elt.value);
        if ((q)!==(metaBook.query.tags))
            metaBook.setQuery(q,false);};

    function showSearchResults(){
        var results=metaBook.query.showResults();
        addClass(results,"hudpanel");
        fdjtDOM.replace("METABOOKSEARCHRESULTS",results);
        metaBook.setMode("searchresults");
        fdjtID("METABOOKSEARCHINPUT").blur();
        fdjtID("METABOOKSEARCHRESULTS").focus();
        metaBook.UI.updateScroller(fdjtID("METABOOKSEARCHRESULTS"));}
    metaBook.showSearchResults=showSearchResults;

    /* Call this to search */

    function startSearch(tag){
        setQuery([tag]);
        metaBook.setMode("refinesearch");}
    metaBook.startSearch=startSearch;

    /* Text input handlers */

    var Selector=fdjtDOM.Selector;
    
    function searchInput_keydown(evt){
        evt=evt||window.event||null;
        var ch=evt.charCode||evt.keyCode;
        var target=fdjtDOM.T(evt), completeinfo=false, completions=false;
        if ((ch===13)||(ch===13)||(ch===59)||(ch===93)) {
            var qstring=target.value; 
            if (fdjtString.isEmpty(qstring)) showSearchResults();
            else {
                completeinfo=metaBook.queryCloud(metaBook.query);
                if (completeinfo.timer) {
                    clearTimeout(completeinfo.timer);
                    completeinfo.timer=false;}
                completions=completeinfo.complete(qstring);
                var completion=(completeinfo.selection)||
                    completeinfo.select(new Selector(".cue"))||
                    completeinfo.select();
                // Signal error?
                if (!(completion)) {
                    var found=metaBook.textindex.termindex[qstring];
                    if ((found)&&(found.length))
                        setQuery(extendQuery(metaBook.query,qstring));
                    return;}
                var value=completeinfo.getValue(completion);
                setQuery(extendQuery(metaBook.query,value));}
            fdjtDOM.cancel(evt);
            if ((metaBook.search_gotlucky) && 
                (metaBook.query.results.length>0) &&
                (metaBook.query.results.length<=metaBook.search_gotlucky))
                showSearchResults();
            else {
                /* Handle new info */
                completeinfo=metaBook.queryCloud(metaBook.query);
                completeinfo.complete("");}
            return false;}
        else if (ch===9) { /* tab */
            var partial_string=target.value;
            completeinfo=metaBook.queryCloud(metaBook.query);
            completions=completeinfo.complete(partial_string);
            fdjtUI.cancel(evt);
            if ((completions.prefix)&&
                (completions.prefix!==partial_string)) {
                target.value=completions.prefix;
                fdjtDOM.cancel(evt);
                setTimeout(function(){
                    metaBook.UI.updateScroller("METABOOKSEARCHCLOUD");},
                           100);
                completeinfo.selectNext();}
            else if (evt.shiftKey) completeinfo.selectPrevious();
            else completeinfo.selectNext();}
        else {}}
    metaBook.UI.handlers.search_keydown=searchInput_keydown;

    function searchInput_keyup(evt){
        evt=evt||window.event||null;
        var ch=evt.charCode||evt.keyCode;
        var target=fdjtDOM.T(evt);
        if ((ch===13)||(ch===13)||(ch===59)||(ch===93)||(ch===9)) {}
        else if (ch===8) {
            setTimeout(function(){searchUpdate(target);},100);}
        else searchUpdate(target);}
    metaBook.UI.handlers.search_keyup=searchInput_keyup;
    
    function searchInput_keypress(evt){
        evt=evt||window.event||null;
        var ch=evt.charCode||evt.keyCode;
        var target=fdjtDOM.T(evt);
        if ((ch===13)||(ch===13)||(ch===59)||(ch===93)||(ch===9)||(ch===8)) {}
        else searchUpdate(target);}
    metaBook.UI.handlers.search_keypress=searchInput_keypress;

    function searchUpdate(input,cloud){
        if (!(input)) input=fdjtID("METABOOKSEARCHINPUT");
        if (!(cloud)) cloud=metaBook.queryCloud(metaBook.query);
        if (input.value.length===0) cloud.clearSelection();
        cloud.complete(input.value,function(results){
            if ((input.value.length>0)&&
                ((!(results))||
                 (results.length===0)||
                 (input.value.length>4))) {
                addRawText(cloud,input.value);
                setTimeout(function(){cloud.complete(input.value);},50);}
            else {}
            metaBook.UI.updateScroller("METABOOKSEARCHCLOUD");});}
    metaBook.searchUpdate=searchUpdate;

    function addRawText(cloud,text,ptree,maxmatch){
        if (!(ptree)) ptree=metaBook.textindex.prefixTree();
        if (!(maxmatch)) maxmatch=42;
        var matches=fdjtString.prefixFind(ptree,text);
        if (matches.length===0) return;
        else if (matches.length>maxmatch) return;
        else {
            var i=0, lim=matches.length; while (i<lim) 
                metaBook.cloudEntry(matches[i++],cloud);}}

    function searchInput_focus(evt){
        evt=evt||window.event||null;
        var input=fdjtDOM.T(evt);
        metaBook.setFocus(input);
        if ((metaBook.mode)&&(metaBook.mode==='searchresults'))
            metaBook.setMode("refinesearch");
        searchUpdate(input);}
    metaBook.UI.handlers.search_focus=searchInput_focus;

    function searchInput_blur(evt){
        evt=evt||window.event||null;
        var input=fdjtDOM.T(evt);
        metaBook.clearFocus(input);}
    metaBook.UI.handlers.search_blur=searchInput_blur;

    function clearSearch(evt){
        var target=fdjtUI.T(evt||window.event);
        var box=fdjtDOM.getParent(target,".searchbox");
        var input=getChild(box,".searchinput");
        fdjtUI.cancel(evt);
        if ((metaBook.query.tags.length===0)&&
            (input.value.length===0)) {
            metaBook.setMode(false); return;}
        else {
            metaBook.empty_cloud.dom.style.fontSize="";
            setQuery(metaBook.empty_query);
            input.value="";
            metaBook.empty_cloud.clearSelection();
            metaBook.empty_cloud.complete("");}
        input.focus();}
    metaBook.UI.handlers.clearSearch=clearSearch;
    
    metaBook.toggleSearch=function(evt){
        evt=evt||window.event;
        if ((metaBook.mode==="refinesearch")||
            (metaBook.mode==="searchresults"))
            metaBook.setMode(false);
        else {
            metaBook.setMode("refinesearch");
            fdjtID("METABOOKSEARCHINPUT").focus();}
        fdjtUI.cancel(evt);};
    
    /* Search result listings */

    var MetaBookSlice=metaBook.Slice;
    function SearchResults(query){
        if (!(this instanceof SearchResults))
            return new SearchResults(query);
        this.query=query; this.results=query.results;
        return MetaBookSlice.call(
            this,fdjtDOM("div.metabookslice.sbookresults"),this.results);}
    metaBook.SearchResults=SearchResults;

    SearchResults.prototype=new MetaBookSlice();
    SearchResults.prototype.renderCard=function renderSearchResult(result){
        return metaBook.renderCard(result,this.query);};
    SearchResults.prototype.sortfn=function searchResultsSortFn(x,y){
        if (x.score) {
            if (y.score) {
                if (x.score===y.score) {
                    if (x.location) {
                        if (y.location) {
                            if (x.location===y.location) {
                                if (x.timestamp) {
                                    if (y.timestamp)
                                        return x.timestamp-y.timestamp;
                                    else return -1;}
                                else return 1;}
                            else return x.location-y.location;}
                        else return -1;}}
                else return (y.score-x.score);}
            else return -1;}
        else return 1;};

    /* Show search results */

    function showResults(query){
        if (query.listing) return query.listing.container;
        else query.listing=new SearchResults(query);
        var div=query.listing.container;
        return div;}
    RefDB.Query.prototype.showResults=
        function(){return showResults(this);};
    
})();

/* Emacs local variables
   ;;;  Local variables: ***
   ;;;  compile-command: "cd ..; make" ***
   ;;;  indent-tabs-mode: nil ***
   ;;;  End: ***
*/
