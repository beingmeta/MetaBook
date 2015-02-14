/* -*- Mode: Javascript; Character-encoding: utf-8; -*- */

/* ###################### metabook/toc.js ###################### */

/* Copyright (C) 2009-2015 beingmeta, inc.

   This file implements the "dynamic table of contents" for the metaBook
   e-reader web application.

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
// var iScroll=((typeof iScroll !== "undefined")?(iScroll):({}));

metaBook.TOC=
    (function(){
        "use strict";
        var fdjtDOM=fdjt.DOM;
        var fdjtUI=fdjt.UI;
        var getParent=fdjtDOM.getParent;
        var mbID=metaBook.ID;
        
        var mbicon=metaBook.icon;
        function navicon(kind){
            switch (kind) {
            case 'right': return mbicon("skim_right",64,64);
            case 'left': return mbicon("skim_left",64,64);
            case 'start': return mbicon("skim_left_stop",64,64);
            case 'end': return mbicon("skim_right_stop",64,64);
            default: return false;}}
        metaBook.navicon=navicon;

        function MetaBookTOC(headinfo,depth,tocspec,prefix,headless){
            var sizebar=fdjtDOM("HR.sizebar");
            var progressbar=fdjtDOM("HR.progressbar");
            var head=((headless)?(false):
                      (fdjtDOM("A.sectname",headinfo.title)));
            var spec=tocspec||"DIV.metabooktoc";
            var next_button=
                ((head)&&
                 ((headinfo.next)?
                  (fdjtDOM.Image(navicon("right"),false,"next")):
                  (fdjtDOM.Image(navicon("end"),false,"nextstop"))));
            if ((next_button)&&(headinfo.next))
                next_button.frag=headinfo.next.frag;
            var back_button=
                ((head)&&
                 ((headinfo.prev)?
                  (fdjtDOM.Image(navicon("left"),false,"back")):
                  (fdjtDOM.Image(navicon("start"),false,"backstop"))));
            if ((back_button)&&(headinfo.prev))
                back_button.frag=headinfo.prev.frag;
            var head_div=((head)&&(fdjtDOM("DIV.head",progressbar,sizebar,head)));
            var toc=fdjtDOM(spec,next_button,back_button,head_div,
                            generate_spanbar(headinfo),
                            generate_subsections(headinfo));
            var sub=headinfo.sub;
            if (!(depth)) depth=0;
            if (head) {
                head_div.setAttribute("name","SBR"+headinfo.frag);
                head.name="SBR"+headinfo.frag;
                head.frag=headinfo.frag;}
            toc.sbook_start=headinfo.starts_at;
            toc.sbook_end=headinfo.ends_at;
            var hhinfo=headinfo.head;
            if ((sizebar)&&(hhinfo)) {
                var hstart=hhinfo.starts_at, hend=hhinfo.ends_at;
                var hlen=hend-hstart;
                sizebar.style.width=
                    ((100*(headinfo.ends_at-headinfo.starts_at))/hlen)+"%";
                sizebar.style.left=
                    ((100*(headinfo.starts_at-hstart))/hlen)+"%";
                progressbar.style.left=
                    ((100*(headinfo.starts_at-hstart))/hlen)+"%";}
            else if (sizebar) sizebar.style.width="100%";
            else {}
            fdjtDOM.addClass(toc,"metabooktoc"+depth);
            toc.id=(prefix||"METABOOKTOC4")+headinfo.frag;
            if ((!(sub))||(!(sub.length))) {
                fdjtDOM.addClass(toc,"metabooktocleaf");
                return toc;}
            var i=0; var n=sub.length;
            while (i<n) {
                toc.appendChild(
                    new MetaBookTOC(sub[i++],depth+1,spec,prefix,headless));}
            if (depth===0) {
                if (prefix)
                    metaBook.TapHold[prefix]=fdjtUI.TapHold(
                        toc,{id: (prefix||"TOC"),holdclass: false,
                             taptapthresh: 0,
                             touchtoo: function(evt){
                                 evt=evt||window.event;
                                 if (metaBook.previewing)
                                     metaBook.stopPreview("touchtoo",true);
                                 this.abort(evt,"touchtoo");},
                             noslip: (prefix==="METABOOKSTATICTOC4")});
                else fdjtUI.TapHold(toc,{holdfast: true});
                metaBook.UI.addHandlers(toc,'toc');}
            return toc;}
        
        function generate_subsections(headinfo) {
            var sub=headinfo.sub;
            if ((!(sub)) || (!(sub.length))) return false;
            var div=fdjtDOM("div.sub");
            var i=0; var n=sub.length;
            while (i<n) {
                var subinfo=sub[i];
                var subspan=fdjtDOM("A.sectname",subinfo.title);
                subspan.frag=subinfo.frag;
                subspan.name="SBR"+subinfo.frag;
                fdjtDOM(div,((i>0)&&" \u00b7 "),subspan);
                i++;}
            return div;}
        
        function generate_spanbar(headinfo){
            var spanbar=fdjtDOM("div.spanbar.metabookslice");
            var spans=fdjtDOM("div.spans"), span=false;
            var start=headinfo.starts_at, end=headinfo.ends_at;
            var len=end-start;
            var subsections=headinfo.sub, last_info, sectnum=0;
            var head=headinfo.elt||mbID(headinfo.frag);
            spanbar.starts=start; spanbar.ends=end;
            if ((!(subsections)) || (subsections.length===0))
                return false;
            var progress=fdjtDOM("div.progressbox","\u00A0");
            var range=false; var firstspan=false, lastspan=false;
            fdjtDOM(spanbar,progress,spans);
            fdjtDOM(spans,range);
            progress.style.left="0%";
            if (range) range.style.left="0%";
            var i=0; while (i<subsections.length) {
                var spaninfo=subsections[i++];
                var subsection=spaninfo.elt||mbID(spaninfo.frag);
                var spanstart; var spanend; var addname=true;
                if ((sectnum===0) && ((spaninfo.starts_at-start)>0)) {
                    /* Add 'fake section' for the precursor of the
                     * first actual section */
                    spanstart=start;  spanend=spaninfo.starts_at;
                    spaninfo=headinfo;
                    subsection=headinfo.elt||mbID(headinfo.frag);
                    i--; sectnum++; addname=false;}
                else {
                    spanstart=spaninfo.starts_at; spanend=spaninfo.ends_at;
                    sectnum++;}
                span=generate_span(
                    sectnum,subsection,spaninfo.title,spanstart,spanend,len,
                    ("SBR"+spaninfo.frag),start);
                if (!(firstspan)) {
                    firstspan=span;
                    addClass(firstspan,"metabookfirstspan");}
                lastspan=span;
                spans.appendChild(span);
                if (addname) {
                    var anchor=fdjtDOM("A.metabooktitle",spaninfo.title);
                    anchor.name="SBR"+spaninfo.frag;
                    spans.appendChild(anchor);}
                last_info=spaninfo;}
            if ((end-last_info.ends_at)>0) {
                /* Add 'fake section' for the content after the last
                 * actual section */
                span=generate_span(
                    sectnum,head,headinfo.title,last_info.ends_at,end,len,start);
                addClass(span,"metabooklastspan");
                spanbar.appendChild(span);}
            else if (lastspan) addClass(lastspan,"metabooklastspan");
            return spanbar;}

        function generate_span(sectnum,subsection,title,
                               spanstart,spanend,len,name,pstart){
            var spanlen=spanend-spanstart;
            // var anchor=fdjtDOM("A.brick","\u00A0");
            var anchor=fdjtDOM("A.brick","·");
            var span=fdjtDOM("DIV.metabookhudspan",anchor);
            var width=(Math.round(100000000*(spanlen/len))/1000000);
            var left=(Math.round(100000000*((spanstart-pstart)/len))/1000000);
            span.style.left=left+"%";
            span.style.width=width+"%";
            span.frag=subsection.id;
            if (name) anchor.name=name;
            return span;}

        function getTOCPrefix(string){
            var fourpos=string.indexOf("4");
            if (fourpos) return string.slice(0,fourpos+1);
            else return string;}

        var hasClass=fdjtDOM.hasClass;
        var addClass=fdjtDOM.addClass;
        var dropClass=fdjtDOM.dropClass;
        var getChildren=fdjtDOM.getChildren;

        function updateTOC(head,tocroot){
            var prefix=getTOCPrefix(tocroot.id);
            var cur=(getChildren(tocroot,".metabookcurhead"));
            var live=(getChildren(tocroot,".metabooklivehead"));
            var cxt=(getChildren(tocroot,".metabookcxthead"));
            dropClass(tocroot,"metabookcxthead");
            dropClass(tocroot,"metabookcurhead");
            dropClass(cur,"metabookcurhead");
            dropClass(live,"metabooklivehead");
            dropClass(cxt,"metabookcxthead");
            if (!(head)) return;
            var base_elt=document.getElementById(prefix+head.frag);
            var toshow=[]; var base_info=head;
            while (head) {
                var tocelt=document.getElementById(prefix+head.frag);
                var pbar=fdjt.DOM.getChild(tocelt,".progressbar");
                if (tocelt) toshow.push(tocelt);
                if ((pbar)&&(metaBook.location)&&(head.ends_at)) {
                    var loc=metaBook.location-head.starts_at;
                    var len=head.ends_at-head.starts_at;
                    var pct=(len)&&(loc)&&(100*(loc/len));
                    if ((pct)&&(pct>=0)&&(pct<=100))
                        pbar.style.left=pct+"%";}
                head=head.head;}
            var n=toshow.length-1;
            if ((base_info.sub)&&(base_info.sub.length))
                addClass(base_elt,"metabookcxthead");
            else if (toshow[1]) addClass(toshow[1],"metabookcxthead");
            else {}
            // Go backwards to accomodate some redisplayers
            while (n>=0) {
                var show=toshow[n--];
                if ((show.tagName==='A')&&
                    (show.className.search(/\bbrick\b/)>=0))
                    addClass(show.parentNode,"metabooklivehead");
                addClass(show,"metabooklivehead");}
            addClass(base_elt,"metabookcurhead");}
        MetaBookTOC.updateTOC=updateTOC;

        MetaBookTOC.setHead=function setHead(headinfo){
            var livetitles=(fdjtDOM.$("a.metabooklivehead.metabooktitle"));
            var i=0; var lim=livetitles.length;
            while (i<lim) livetitles[i++].style.fontSize='';
            var tocs=fdjtDOM.$(".metabooktoc0");
            // Update current location in ToCs
            i=0; lim=tocs.length; while (i<lim) {
                updateTOC(headinfo,tocs[i++]);}
            if (!(headinfo)) {
                addClass(tocs,"metabooklivehead");
                addClass(tocs,"metabookcurhead");
                return;}
            var head=headinfo;
            while (head) {
                var level=head.level;
                var refs=document.getElementsByName("SBR"+head.frag);
                var j=0; var jlim=refs.length;
                while (j<jlim) {
                    var ref=refs[j++];
                    var toc=getParent(ref,".metabooktoc");
                    var isbrick=((ref.tagName==='A')&&(ref.className)&&
                                 (ref.className.search(/\bbrick\b/)>=0));
                    if ((level)&&(isbrick)&&
                        (!(hasClass(toc,"metabooktoc"+(level-1)))))
                        continue;
                    addClass(ref,"metabooklivehead");
                    if (isbrick) addClass(ref.parentNode,"metabooklivehead");}
                head=head.head;}
            setTimeout(function(){scaleTitles(headinfo);},200);};

        function scaleTitles(headinfo){
            // Now, autosize the titles
            var head=headinfo;
            while (head) {
                var refs=document.getElementsByName("SBR"+head.frag);
                var j=0; var nrefs=refs.length;
                while (j<nrefs) {
                    var elt=refs[j++];
                    if ((elt.tagName==='A')&&(hasClass(elt,"metabooktitle"))) {
                        var cw=elt.clientWidth, sw=elt.scrollWidth;
                        if (sw>cw) elt.style.fontSize=(80*(cw/sw))+"%";}}
                head=head.head;}}
        
        return MetaBookTOC;})();

/* Emacs local variables
   ;;;  Local variables: ***
   ;;;  compile-command: "cd ..; make" ***
   ;;;  indent-tabs-mode: nil ***
   ;;;  End: ***
*/
