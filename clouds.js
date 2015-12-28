/* -*- Mode: Javascript; Character-encoding: utf-8; -*- */

/* ###################### metabook/clouds.js ###################### */

/* Copyright (C) 2009-2015 beingmeta, inc.

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

(function(){
    "use strict";
    var mB=metaBook;
    var Trace=mB.Trace;
    var fdjtLog=fdjt.Log;
    var fdjtDOM=fdjt.DOM;
    var fdjtUI=fdjt.UI;
    var $ID=fdjt.ID;
    var TapHold=fdjt.TapHold;
    var RefDB=fdjt.RefDB, Ref=fdjt.Ref;
    var KNode=Knodule.KNode;

    metaBook.search_cloud=false;
    if (!(metaBook.empty_cloud)) metaBook.empty_cloud=false;
    if (!(metaBook.show_refiners)) metaBook.show_refiners=25;
    if (!(metaBook.search_gotlucky)) metaBook.search_gotlucky=7;
    
    var Completions=fdjtUI.Completions;
    var addClass=fdjtDOM.addClass;
    var dropClass=fdjtDOM.dropClass;
    var getChildren=fdjtDOM.getChildren;
    var getChild=fdjtDOM.getChild;
    var getParent=fdjtDOM.getParent;
    var hasParent=fdjtDOM.hasParent;
    var hasClass=fdjtDOM.hasClass;
    var log=fdjtLog;
    var kbref=RefDB.resolve;

    function makeCloud(tags,scores,freqs,n,completions,init_dom,roots) {
        var start=new Date();
        var sourcedb=metaBook.sourcedb;
        var knodule=metaBook.knodule;
        var dom=init_dom||false;
        var i=0; var n_terms=tags.length;
        // Move it out of the flow
        var breadcrumb=false;
        if ((dom)&&(dom.parentNode)) {
            breadcrumb=document.createTextNode("");
            dom.parentNode.replaceChild(breadcrumb,dom);}
        if (dom) addClass(dom,"completions");
        else if ((completions)&&(completions.dom))
            dom=completions.dom;
        else dom=fdjtDOM("div.completions.cloud.noinput",
                         getShowAll(usecues,n_terms));
        var maxmsg=fdjtDOM(
            "div.maxcompletemsg",
            "There are a lot ","(",fdjtDOM("span.completioncount","really"),")",
            " of completions.  ");
        var emptymsg=fdjtDOM("div.nomatchmsg","(no matches)");
        fdjtDOM.prepend(dom,emptymsg,maxmsg);
        
        if (!(completions)) completions=new Completions(dom);

        var info=organize_tags(tags,scores,knodule,sourcedb);
        var usecues=(n_terms>17)&& (// lots of terms AND
            (info.n_primes>0) || // there are prime terms OR
            (info.max!==info.min) || // scores are different OR
            // there are a small number of real concepts to use
            ((info.normals._count)<17) ||
                // there's are a lot of weak terms
                ((n_terms/info.normals._count)>4));
        if (!(usecues)) fdjtDOM.addClass(dom,"showall");
        else if (getChild(dom,".showall"))
            fdjtDOM.prepend(dom,getShowAll(usecues,n_terms));
        else {}

        // Sort the tags before adding them
        tags=[].concat(tags);
        sort_tags(tags);

        // Compute score sum to get value for the cue threshold
        var score_sum=0; while (i<n_terms) {
            var score=scores.get(tags[i++]);
            if (score) score_sum=score_sum+score;}

        i=0; while (i<n_terms) {
            var dterm=tags[i++];
            var span=cloudSpan(
                dterm,completions,scores,freqs,score_sum/n_terms);
            dom.appendChild(span);
            dom.appendChild(document.createTextNode(" "));}
        sizeCloud(completions,scores,roots);

        var end=new Date();
        if (Trace.clouds)
            fdjtLog("Made cloud for %d tags in %f seconds",
                    tags.length,(end.getTime()-start.getTime())/1000);

        // Put the cloud back into the flow (if neccessary)
        if (breadcrumb) breadcrumb.parentNode.replaceChild(dom,breadcrumb);

        completions.updated=function(){adjustCloudFont(this);};

        return completions;}
    metaBook.makeCloud=makeCloud;

    function cloudSpan(dterm,completions,scores,freqs){
        var freq=freqs.get(dterm)||1;
        var score=scores.get(dterm);
        var span=cloudEntry(dterm,completions);
        var title=span.title;
        if (freq) {
            if (title) title=title+"; count="+freq;
            else title="count="+freq;}
        if ((score)&&(score!==freq)) title=title+"; s="+score;
        span.title=title;
        if (freq===1) addClass(span,"singleton");
        else if (freq===2) addClass(span,"doubleton");
        else {}
        return span;}
    
    function initCloudEntry(tag,entry,cloud,lang){
        // This is called when the KNode is loaded
        var variations=false, suffix=false;
        if (tag instanceof KNode) {
            var knode=tag, dterm=knode.dterm, origin=false;
            if (tag._db===metaBook.knodule) origin="index";
            else if (tag._db.fullname) {
                origin=tag._db.fullname; suffix=fdjtDOM("sup","*");}
            else {
                var sourceref=metaBook.sourcedb.probe(tag._db.name);
                if (sourceref) {
                    origin=tag._db.fullname=sourceref.name;
                    suffix=fdjtDOM("sup","*");}
                else {
                    origin="glosses";
                    suffix=fdjtDOM("sup","*");}}
            entry.setAttribute("data-key",dterm);
            if (typeof suffix === "string")
                entry.innerHTML=dterm+suffix;
            else if (suffix) {
                entry.innerHTML=dterm;
                entry.appendChild(suffix);}
            else entry.innerHTML=dterm;
            var synonyms=knode[lang];
            if ((synonyms)&&(typeof synonyms === 'string'))
                synonyms=[synonyms];
            if (synonyms) {
                var i=0; while (i<synonyms.length) {
                    var synonym=synonyms[i++];
                    if (synonym===dterm) continue;
                    var variation=fdjtDOM("span.variation",synonym,"=");
                    variation.setAttribute("data-key",synonym);
                    if (!(variations)) variations=fdjtDOM("span.variations");
                    variations.appendChild(variation);}}
            if (knode.prime) {
                addClass(entry,"prime");
                addClass(entry,"cue");}
            else if (knode.weak) addClass(entry,"weak");
            else {}
            var noun=((dterm.search(/\.\.\.$/)>0)?("root form"):("concept"));
            var title=
                ((knode.prime)?("key "):
                 (knode.weak)?("weak "):(""))+
                ((origin==="index")?("index "+noun+" "):
                 (noun+" (from "+origin+") "));
            if (knode.about)
                title=title+knode.dterm+": "+knode.about;
            else {
                var def=knode.toPlaintext();
                if ((def)&&(def!==knode.dterm))
                    title=title+knode.dterm+"="+knode.toPlaintext();
                else title=title+"'"+knode.dterm+"'";}
            entry.title=title;}
        else if (tag.name) {
            addClass(entry,"source"); addClass(entry,"account");
            entry.setAttribute("data-key",tag.name);
            entry.innerHTML=tag.name;}
        else if (tag.refuri) {
            addClass(entry,"doc");
            entry.setAttribute("data-key",tag.refuri);
            if ((cloud)&&(entry.title))
                cloud.addKeys(entry,entry.title);
            entry.innerHTML=tag.refuri;}
        else {}
        if (variations) fdjtDOM.prepend(entry,variations);
        if (cloud) cloud.addKeys(entry);}
    function initCloudEntries(tag){
        var droplets=tag.droplets;
        if (droplets) {
            var i=0, lim=droplets.length; 
            while (i<lim) {
                var droplet=droplets[i++];
                initCloudEntry(tag,droplet.entry,droplet.cloud,droplet.lang);}
            delete tag.droplets;}}

    function cloudEntry(tag,cloud,lang,usespec){
        var entry;
        if (!(usespec)) usespec="span.completion";
        if (typeof lang !== "string")
            lang=(metaBook.language)||(Knodule.language)||"EN";
        var existing=(cloud)&&(cloud.getByValue(tag,".completion"));
        if ((existing)&&(existing.length)) return existing[0];
        else if (typeof tag === "string") {
            var isrootform=tag.search(/\.\.\.$/)>0;
            var spec=usespec+
                ((isrootform)?(".rootform"):(".rawterm"))+
                ((tag.length>20)?(".longterm"):(""));
            entry=fdjtDOM(spec,fdjtDOM("span.termtext","\u201c"+tag+"\u201d"));
            entry.setAttribute("data-key",tag);
            entry.setAttribute("data-value",tag);
            if (isrootform)
                entry.title="forms "+tag;
            else entry.title=tag;
            if (cloud) cloud.addCompletion(entry,tag,tag);
            return entry;}
        else if (!(tag instanceof Ref)) {
            var strungout=entry.toString();
            entry=fdjtDOM(((strungout.length>20)?
                           (usespec+".weirdterm.longterm"):
                           (usespec+".weirdterm")),
                          "?"+strungout+"\u00bf");
            entry.title=strungout;
            if (cloud) cloud.addCompletion(entry,strungout,tag);
            return entry;}
        else {
            var qid=tag._qid||tag.getQID(), id=tag._id||tag.dterm;
            // Section names as tags
            if (tag._db===metaBook.docdb) {
                var sectname=tag.title, showname;
                if (sectname.length>40)
                    showname=fdjtDOM(
                        "span.name.ellipsis",sectname.slice(0,17),
                        fdjtDOM("span.elision","\u2026"),
                        fdjtDOM("span.elided",
                                sectname.slice(sectname.length-17)));
                else if (sectname.length>25)
                    showname=fdjtDOM("span.name.longname",sectname);
                else showname=fdjtDOM("span.name",sectname);
                showname=fdjtDOM("span.name",sectname);
                entry=fdjtDOM(usespec+".sectname","\u00A7",showname);
                entry.setAttribute("data-key",sectname);
                entry.setAttribute("data-value",tag._qid||tag.getQID());
                if (sectname.length>24) addClass(entry,"longterm");
                if (sectname.length>20) entry.title=sectname;
                if (cloud) cloud.addCompletion(entry,sectname,tag);
                return entry;}
            else if (tag instanceof KNode) 
                entry=fdjtDOM(((id.length>20)?
                               (usespec+".dterm.longterm"):
                               (usespec+".dterm")),
                              qid);
            else entry=fdjtDOM(((id.length>20)?
                                (usespec+".longterm"):
                                (usespec)),
                               qid);
            if (tag.cssclass) addClass(entry,tag.cssclass);
            entry.setAttribute("data-value",qid);
            if (cloud) cloud.addCompletion(entry,false,tag);
            if (tag._live) {
                initCloudEntry(tag,entry,cloud,lang);
                return entry;}
            else if (tag.droplets)
                tag.droplets.push({entry: entry,lang: lang,cloud: cloud});
            else {
                tag.droplets=[{entry: entry,lang: lang,cloud: cloud}];
                tag.onLoad(initCloudEntries);
                return entry;}}}
    metaBook.cloudEntry=cloudEntry;
    
    function addTag2Cloud(tag,cloud,kb,scores,freqs,thresh){
        if (!(kb)) kb=metaBook.knodule;
        if (!(tag)) return;
        else if (tag instanceof Array) {
            var i=0; var lim=tag.length;
            while (i<lim) addTag2Cloud(tag[i++],cloud,kb,scores,freqs,thresh);
            return;}
        else {
            var container=cloud.dom;
            var tagref=(((typeof tag === 'string')&&(kb))?
                        ((RefDB.resolve(tag,kb,Knodule,false))||(tag)):
                        (tag));
            var entry=((scores)?
                       (cloudSpan(tagref,cloud,scores,freqs,thresh)):
                       (cloudEntry(tagref,cloud)));
            if (!(hasParent(entry,container))) fdjtDOM(container,entry," ");
            return entry;}}
    metaBook.addTag2Cloud=addTag2Cloud;

    function getShowAll(use_cues,how_many){
        var showall=(use_cues)&&
            fdjtDOM(
                "span.showall",
                fdjtDOM("span.showmore","more"), 
                // ((how_many)&&(" ("+how_many+")"))
                fdjtDOM("span.showless","fewer"));
        if ((how_many)&&(showall))
            showall.title="There are "+how_many+" in all";
        if (showall) showall.onclick=showall_ontap;
        return showall;}
    metaBook.UI.getShowAll=getShowAll;

    function organize_tags(tags,scores,knodule,sourcedb){
        var min_score=false, max_score=false;
        var normals={}, n_normal=0, n_primes=0;
        var i=0; while (i<tags.length) {
            var tag=tags[i++];
            if (tag instanceof Ref) {
                if (tag.prime) n_primes++;
                if ((tag._db!==sourcedb)&&(!(tag.weak))) {
                    normals[tag]=true; n_normal++;}}
            if (scores) {
                var score=scores.get(tag);
                if (score) {
                    if (min_score===false) min_score=score;
                    else if (score<min_score) min_score=score;
                    if (score>max_score) max_score=score;}}}
        normals._count=n_normal;
        return {normals: normals, n_primes: n_primes,
                min: min_score, max: max_score};}

    function showall_ontap(evt){
        var target=fdjtUI.T(evt);
        var completions=getParent(target,".completions");
        if (completions) {
            fdjtUI.cancel(evt);
            fdjtDOM.toggleClass(completions,"showall");}}

    /* Getting query cloud */

    function queryCloud(query){
        if (query.cloud) return query.cloud;
        else if ((query.tags.length)===0) {
            query.cloud=metaBook.empty_cloud;
            return query.cloud;}
        else {
            var showtags=query.getRefiners();
            var completions=makeCloud(
                showtags,query.tagscores,query.tagfreqs,
                showtags.length,false,false,query.tags);
            var cloud=completions.dom;
            if (!(completions.taphold))
                completions.taphold=new TapHold(cloud);
            addClass(cloud,"searchcloud");
            metaBook.setupGestures(cloud);
            var n_refiners=showtags.length;
            var hide_some=(n_refiners>metaBook.show_refiners);
            if (hide_some) {
                var ranked=[].concat(showtags);
                var scores=query.tagscores;
                ranked.sort(function(x,y){
                    if (((typeof x === "string")&&(typeof y === "string"))||
                        ((x instanceof Ref)&&(y instanceof Ref))) {
                        var xs=scores.get(x), ys=scores.get(y);
                        if ((typeof xs === "number")&&
                            (typeof ys === "number")) 
                            return ys-xs;
                        else if (typeof xs === "number")
                            return -1;
                        else return 1;}
                    else if (typeof x === "string")
                        return 1;
                    else return -1;});
                var i=0, lim=metaBook.show_refiners;
                while (i<lim) {
                    var tag=ranked[i++], elt=completions.getByValue(tag);
                    addClass(elt,"cue");}}
            else addClass(cloud,"showall");
            query.cloud=completions;
            return query.cloud;}}
    metaBook.queryCloud=queryCloud;
    RefDB.Query.prototype.getCloud=function(){
        return queryCloud(this);};
    
    function tag_sorter(x,y,scores){
        // Knodes go before Refs go before strings
        // Otherwise, use scores
        if (x instanceof KNode) {
            if (y instanceof KNode) {} // Fall through
            else return -1;}
        else if (y instanceof KNode) return 1;
        else if (x instanceof Ref) { 
            if (y instanceof Ref) {} // Fall through
            else return -1;}
        else if (y instanceof Ref) return 1;
        else if ((typeof x === "string")&&
                 (typeof y === "string"))
        {}
        // We should never reach these cases because tags should
        //  always be strings, Refs, or KNodes.
        else if  (typeof x === typeof y) {
            if (x<y) return -1;
            else if (x>y) return 1;
            else return 0;}
        else {
            var xt=typeof x, yt=typeof y;
            if (xt<yt) return -1;
            else if (xt>yt) return 1;
            else return 0;}
        var xv=scores.get(x), yv=scores.get(y);
        if (typeof xv === "undefined") {
            if (typeof yv === "undefined") {
                var xid, yid;
                if (typeof x === "string") {
                    xid=x; yid=y;}
                else {
                    xid=x._qid||x.getQID();
                    yid=y._qid||y.getQID();}
                if (xid<yid) return -1;
                else if (yid>xid) return 1;
                else return 0;}
            else return 1;}
        else if (typeof yv === "undefined") return -1;
        else if (xv===yv) {
            if (x<y) return -1;
            else if (x>y) return 1;
            else return 0;}
        else if (xv>yv) return -1;
        else return 1;}
    metaBook.tag_sorter=tag_sorter;
    function sort_tags(tags){
        // Sort alphabetically, sort of
        tags.sort(function(x,y){
            var sx=x, sy=y;
            // Knodes go before Refs go before strings
            // Otherwise, use scores
            if (x instanceof KNode) {
                if (y instanceof KNode) {
                    sx=x.dterm; sy=y.dterm;}
                else return -1;}
            else if (y instanceof KNode) return 1;
            else if (x instanceof Ref) { 
                if (y instanceof Ref) {
                    sx=x._qid||x.getQID(); sy=y._qid||y.getQID();}
                else return -1;}
            else if (y instanceof Ref) return 1;
            else if ((typeof x === "string")&&
                     (typeof y === "string")) {}
            else if (typeof x === "string") return -1;
            else if (typeof y === "string") return 1;
            // We should never reach these cases because tags should
            //  always be strings, Refs, or KNodes.
            else if  (typeof x === typeof y) {
                if (x<y) return -1;
                else if (x>y) return 1;
                else return 0;}
            else {
                var xt=typeof x, yt=typeof y;
                if (xt<yt) return -1;
                else if (xt>yt) return 1;
                else return 0;}
            if ((sx[0]==='\u00a7')&&(sy[0]!=='\u00a7')) return 1;
            if ((sy[0]==='\u00a7')&&(sx[0]!=='\u00a7')) return -1;
            if (sx.search(/\w/)>0) sx=sx.slice(sx.search(/\w/));
            if (sy.search(/\w/)>0) sy=sy.slice(sy.search(/\w/));
            if (sx<sy) return -1;
            else if (sx>sy) return 1;
            else return 0;});}
    metaBook.sortTags=sort_tags;
    
    function sortCloud(cloud){
        var values=[].concat(cloud.values);
        sort_tags(values);
        var byvalue=cloud.byvalue;
        var holder=document.createDocumentFragment();
        var i=0, lim=values.length;
        while (i<lim) {
            var value=values[i++];
            var completion=byvalue.get(value);
            if (completion) {
                if (i>1) holder.appendChild(document.createTextNode(" "));
                holder.appendChild(completion);}}
        cloud.dom.appendChild(holder);}
    metaBook.sortCloud=sortCloud;

    function sizeCloud(cloud,scores,roots){
        var gscores=metaBook.tagscores;
        var gweights=metaBook.tagweights;
        var values=cloud.values, byvalue=cloud.byvalue;
        var compscores=new Array(values.length);
        var matchscores=new Array(values.length);
        var i=0, lim=values.length;
        var min_vscore=Infinity, max_vscore=-1;
        var min_score=Infinity, max_score=-1;
        if (Trace.clouds)
            fdjtLog("Sizing %d tags in cloud %o with roots %o",
                    values.length,cloud.dom,roots);
        while (i<lim) {
            var value=values[i], score, matchscore=false;
            if ((roots)&&(roots.length)&&(roots.indexOf(value)>=0)) {
                matchscores[i]=compscores[i]=false; i++; continue;}
            if (scores) {
                matchscore=scores.get(value);
                var gscore=gscores.get(value);
                if (gscore) {
                    var gweight=gweights.get(value)||1;
                    score=(matchscore/gscore)*(gweight);}
                else score=false;}
            else score=gscores.get(value);
            if ((typeof score === "number")&&(!(isNaN(score)))) {
                compscores[i]=score;
                if (score<min_vscore) min_vscore=score;
                if (score>max_vscore) max_vscore=score;}
            else compscores[i]=false;
            if ((typeof matchscore === "number")&&(!(isNaN(matchscore)))) {
                matchscores[i]=matchscore;
                if (matchscore<min_score) min_score=matchscore;
                if (matchscore>max_score) max_score=matchscore;}
            else matchscores[i]=false;
            i++;}
        if (Trace.clouds)
            fdjtLog("Sizing %d tags in %o with scores in [%o,%o]",
                    values.length,cloud.dom,min_vscore,max_vscore);
        cloud.dom.style.display='none';
        i=0; while (i<lim) {
            var v=values[i], s=compscores[i], ms=matchscores[i];
            var elt=byvalue.get(v);
            if (v.prime) {
                addClass(elt,"prime"); addClass(elt,"cue");}
            if ((roots)&&(roots.length)&&(roots.indexOf(v)>=0)) 
                addClass(elt,"cloudroot");
            if (!((s)||(ms))) {
                addClass(elt,"unscored");
                elt.style.fontSize=""; i++;
                continue;}
            var factor=((s)?((s-min_vscore)/(max_vscore-min_vscore)):
                        ((ms-min_score)/(max_score-min_score)));
            var fsize=50+(150*factor);
            if (fsize<200)
                elt.style.fontSize=Math.round(fsize)+"%";
            else elt.style.fontSize="200%";
            i++;}
        if (Trace.clouds)
            fdjtLog("Finished computing sizes for %o using scores [%o,%o]",
                    cloud.dom,min_vscore,max_vscore);
        cloud.dom.style.display='';
        dropClass(cloud.dom,"working");
        if (Trace.clouds)
            fdjtLog("Rendered new cloud %o using scores [%o,%o]",
                    cloud.dom,min_vscore,max_vscore);
        if (cloud.dom.parentNode) setTimeout(function(){
            adjustCloudFont(cloud);},50);
        if (Trace.clouds)
            fdjtLog("Finished sizing tags in %o using scores [%o,%o]",
                    cloud.dom,min_vscore,max_vscore);}
    metaBook.sizeCloud=sizeCloud;

    function searchcloud_select(evt){
        evt=evt||window.event;
        var target=fdjtDOM.T(evt);
        var completion=getParent(target,".completion");
        if (hasClass(completion,"cloudroot")) {
            if (Trace.gestures)
                log("cloud tap on cloudroot %o",completion);
            return;}
        if (Trace.gestures) log("cloud tap on %o",completion);
        var completions=getParent(target,".completions");
        if (completion) {
            var cinfo=metaBook.query.cloud||metaBook.query.getCloud();
            var value=cinfo.getValue(completion);
            if (typeof value !== 'string') add_searchtag(value);
            else  if (value.length===0) {}
            else if (value.indexOf('@')>=0)
                add_searchtag(kbref(value));
            else if ((metaBook.knodule)&&(metaBook.knodule.probe(value)))
                add_searchtag(metaBook.knodule.probe(value));
            else add_searchtag(value);
            fdjtUI.cancel(evt);}
        else if (fdjtDOM.inherits(target,".resultcounts")) {
            metaBook.showSearchResults(metaBook.query);
            metaBook.setMode("searchresults");
            $ID("METABOOKSEARCHINPUT").blur();
            $ID("METABOOKSEARCHRESULTS").focus();
            fdjtUI.cancel(evt);}
        else if (fdjtDOM.inherits(target,".refinercounts")) {
            fdjtDOM.toggleClass(completions,"showall");
            fdjtDOM.cancel(evt);}
        else if (fdjtDOM.inherits(target,".maxcompletemsg")) {
            if (!(metaBook.touch)) 
                $ID("METABOOKSEARCHINPUT").focus();
            fdjtDOM.toggleClass(completions,"showall");
            fdjtDOM.cancel(evt);}
        else {}}
    metaBook.UI.handlers.searchcloud_select=searchcloud_select;

    function add_searchtag(value){
        metaBook.setQuery(metaBook.extendQuery(metaBook.query,value));}

    metaBook.UI.searchCloudToggle=function(){
        fdjtDOM.toggleClass($ID('METABOOKSEARCHCLOUD'),'showall');};

    function setCloudCues(cloud,tags){
        // Clear any current tagcues from the last gloss
        var cursoft=getChildren(cloud.dom,".cue.softcue");
        var i=0; var lim=cursoft.length;
        while (i<lim) {
            var cur=cursoft[i++];
            dropClass(cur,"cue");
            dropClass(cur,"softcue");}
        // Get the tags on this element as cues
        var newcues=cloud.getByValue(tags);
        i=0; lim=newcues.length; while (i<lim) {
            var completion=newcues[i++];
            if (!(hasClass(completion,"cue"))) {
                addClass(completion,"cue");
                addClass(completion,"softcue");}}}
    function setCloudCuesFromTarget(cloud,target){
        var tags=[];
        var targetid=((target.codexbaseid)||(target.id)||(target.frag));
        var info=metaBook.docinfo[targetid];
        var glosses=metaBook.glossdb.find('frag',targetid);
        var knodule=metaBook.knodule;
        if ((info)&&(info.tags)) tags=tags.concat(info.tags);
        if ((info)&&(info.autotags)&&(info.autotags.length)) {
            var autotags=info.autotags; var j=0; var jlim=autotags.length;
            while (j<jlim) {
                var kn=knodule.probe(autotags[j]);
                if (kn) tags.push(kn.tagString());
                j++;}}
        var i=0; var lim=glosses.length;
        while (i<lim) {
            var g=glosses[i++]; var gtags=g.tags;
            if (gtags) tags=tags.concat(gtags);}
        setCloudCues(cloud,tags);}
    metaBook.setCloudCues=setCloudCues;
    metaBook.setCloudCuesFromTarget=setCloudCuesFromTarget;

    function adjustCloudFont(cloud){
        var round=Math.round, sqrt=Math.sqrt;
        var dom=cloud.dom, parent=dom.parentNode;
        if (!(parent)) {
            dom.style.fontSize="";
            return;}
        var pct=100;
        dom.style.fontSize="";
        var ih=dom.scrollHeight, oh=parent.clientHeight;
        if (Trace.clouds)
            fdjtLog("Adjusting cloud %o: %o/%o",dom,ih,oh);
        if ((oh===0)||(ih===0)) return;
        if ((ih<oh)&&(ih>(oh*0.8))) return;
        else if (ih>(oh*2)) return;
        else {
            oh=oh*0.9;
            if (ih<oh)
                pct=(round(sqrt(oh/ih)*(pct/100)*100));
            else pct=(round((oh/ih)*(pct/100)*100));
            if (pct>200)
                dom.style.fontSize="200%";
            else dom.style.fontSize=pct+"%";
            if (Trace.clouds)
                fdjtLog("Adjusted cloud %o: %o/%o to %o%%",dom,ih,oh,pct);}}
    metaBook.adjustCloudFont=adjustCloudFont;
    Completions.prototype.adjustCloudFont=function(){
        return adjustCloudFont(this);};

})();

/* Emacs local variables
   ;;;  Local variables: ***
   ;;;  compile-command: "cd ..; make" ***
   ;;;  indent-tabs-mode: nil ***
   ;;;  End: ***
*/
