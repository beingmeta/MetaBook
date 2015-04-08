/* -*- Mode: Javascript; Character-encoding: utf-8; -*- */

/* ###################### metabook/simpletoc.js ###################### */

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

metaBook.TOCSlice=
    (function(){
        "use strict";
        var fdjtDOM=fdjt.DOM;
        var addClass=fdjtDOM.addClass;
        var dropClass=fdjtDOM.dropClass;
        var $=fdjtDOM.$;
        
        var MetaBookSlice=metaBook.Slice;

        var mbicon=metaBook.icon;
        function navicon(kind){
            switch (kind) {
            case 'right': return mbicon("skim_right",64,64);
            case 'left': return mbicon("skim_left",64,64);
            case 'start': return mbicon("skim_left_stop",64,64);
            case 'end': return mbicon("skim_right_stop",64,64);
            default: return false;}}
        metaBook.navicon=navicon;

        function tocBar(headinfo,context){
            var title=fdjtDOM("a.sectname",headinfo.title);
            var elements=fdjtDOM("div.elements",
                                 fdjtDOM("div.toctext",
                                         ((context)&&(context.cloneNode(true))),
                                         title));
            var tocbar=fdjtDOM("div.mbtoc",elements);
            var start=headinfo.starts_at, end=headinfo.ends_at, sectlen=end-start;
            if ((headinfo.sub)&&(headinfo.sub.length)) {
                var sub=headinfo.sub; var s=0, smax=sub.length;
                addClass(tocbar,"fdjtpagehead");
                while (s<smax) {
                    var subsect=sub[s++], brick=fdjtDOM("a.brick"); // ," "
                    var left=subsect.starts_at, size=subsect.ends_at-left;
                    brick.name="MBTOC4"+subsect.frag;
                    brick.style.left=(((left-start)/sectlen)*100)+"%";
                    brick.style.width=(((size)/sectlen)*100)+"%";
                    elements.appendChild(brick);}}
            else {
                var parent=headinfo.head;
                var rel_start=headinfo.starts_at-parent.starts_at;
                var outer_length=parent.ends_at-parent.starts_at;
                var inner_length=headinfo.ends_at-headinfo.starts_at;
                var showsize=fdjtDOM("a.showsize");
                showsize.style.width=((inner_length/outer_length)*100)+"%";
                showsize.style.left=((rel_start/outer_length)*100)+"%";
                elements.appendChild(showsize);}
            elements.appendChild(fdjtDOM("div.posbar"));
            tocbar.id="MBTOC4"+headinfo.frag;
            tocbar.setAttribute("name","MBTOC4"+headinfo.frag);
            tocbar.setAttribute("data-passage",headinfo.frag);
            tocbar.setAttribute("data-location",headinfo.starts_at);
            tocbar.setAttribute("data-level",headinfo.toclevel);
            addClass(tocbar,"mbtoc"+headinfo.toclevel);
            return tocbar;}

        function maketoc(slice,headinfo,context){
            var bar=((headinfo.toclevel)&&(tocBar(headinfo,context)));
            var card=((bar)&&
                      ({dom: bar,about: headinfo,id: headinfo._id,
                        head: headinfo.frag,passage: headinfo._id,
                        location: headinfo.starts_at}));
            if (card) {
                slice.addCards([card]);
                slice.container.appendChild(bar);}
            context=fdjtDOM("span.context",fdjtDOM("span.tocpath","§",headinfo.title));
            if ((headinfo.sub)&&(headinfo.sub.length)) {
                var sub=headinfo.sub;
                var s=0, slim=sub.length; while (s<slim) {
                    maketoc(slice,sub[s++],context);}}
            return slice;}

        function MetaBookTOC(rootinfo,dom){
            if (!(this instanceof MetaBookTOC))
                return new MetaBookTOC(rootinfo,dom);
            MetaBookSlice.call(this,dom);
            maketoc(this,rootinfo);
            return this;}
        MetaBookTOC.prototype=new MetaBookSlice();

        MetaBookTOC.setHead=function setHead(headinfo){
            dropClass($(".mblivetoc"),"mblivetoc");
            dropClass($(".mbcurtoc"),"mbcurtoc");
            var head=headinfo;
            while (head) {
                var refs=document.getElementsByName("MBTOC4"+head.frag);
                var j=0; var jlim=refs.length;
                while (j<jlim) {
                    var ref=refs[j++];
                    addClass(ref,"mblivetoc");
                    if (head===headinfo) addClass(ref,"mbcurtoc");}
                head=head.head;}
            var toc=metaBook.statictoc;
            if (toc) {
                var info=toc.byfrag[headinfo.frag];
                if (info) toc.setSkim(info.dom);}};
        MetaBookTOC.prototype.mode="statictoc";

        metaBook.TOC=MetaBookTOC;

        return MetaBookTOC;})();

/* Emacs local variables
   ;;;  Local variables: ***
   ;;;  compile-command: "cd ..; make" ***
   ;;;  indent-tabs-mode: nil ***
   ;;;  End: ***
*/
