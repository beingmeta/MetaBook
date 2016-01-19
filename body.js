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

// body.js
(function(){
    "use strict";
    var fdjtDOM=fdjt.DOM, fdjtLog=fdjt.Log, $ID=fdjt.ID;
    var fdjtTime=fdjt.Time, fdjtString=fdjt.String;
    var dropClass=fdjtDOM.dropClass, addClass=fdjtDOM.addClass;
    var getGeometry=fdjtDOM.getGeometry;
    var getChildren=fdjtDOM.getChildren, getChild=fdjtDOM.getChild;
    var toArray=fdjtDOM.toArray;
    var isEmpty=fdjtString.isEmpty;

    var mB=metaBook, Trace=metaBook.Trace;
    var applyMetaClass=mB.applyMetaClass;
    /* Initializing the body and content */
    var note_counter=1;
    
    var fixStaticRefs=metaBook.fixStaticRefs;
    
    function initBody(){
        var body=document.body, started=fdjtTime();
        var init_content=$ID("CODEXCONTENT");
        var content=(init_content)||(fdjtDOM("div#CODEXCONTENT"));
        var i, lim;
        if (Trace.startup>2) fdjtLog("Starting initBody");

        addClass(content,"metabookcontent");
        addClass(content,"codexroot");

        body.setAttribute("tabindex",1);
        /* Remove explicit constraints */
        body.style.fontSize=""; body.style.width="";

        // Save those DOM elements in a handy place
        metaBook.content=content;

        // Move all the notes together
        var notesblock=$ID("METABOOKNOTES")||
            fdjtDOM("div.metabookbackmatter#METABOOKNOTES");
        applyMetaClass("htmlbooknote");
        applyMetaClass("htmlbooknote","METABOOK.booknotes");
        addClass(fdjtDOM.$("span[data-type='footnote']"),
                 "htmlbooknote");
        var allnotes=getChildren(content,".htmlbooknote");
        i=0; lim=allnotes.length; while (i<lim) {
            var notable=allnotes[i++]; var counter=note_counter++;
            var noteid="METABOOKNOTE"+counter;
            var refid="METABOOKNOTE"+counter+"_ref";
            var label_text=notable.getAttribute("data-label")||
                (""+counter);
            var label_node=
                getChild(notable,"label")||
                getChild(notable,"summary")||
                getChild(notable,".html5label")||
                getChild(notable,".html5summary");
            var anchor=fdjtDOM.Anchor(
                "#"+noteid,"A.mbnoteref.htmlnoteref",
                ((label_node)?(label_node.cloneNode(true)):
                 (label_text)));
            var backlink=fdjtDOM.Anchor(
                "#"+refid,"A.htmlackref",
                ((label_node)?(label_node.cloneNode(true)):
                 (label_text)));
            anchor.id=refid;
            fdjtDOM.replace(notable,anchor);
            dropClass(notable,"booknote");
            var noteblock=
                ((notable.tagName==='SPAN')?
                 fdjtDOM("div.booknotebody",
                         backlink,toArray(notable.childNodes)):
                 fdjtDOM("div.booknotebody",backlink,notable));
            noteblock.id=noteid;
            fdjtDOM.append(notesblock,noteblock,"\n");}
        
        if (!(init_content)) {
            var children=[], childnodes=body.childNodes;
            i=0; lim=childnodes.length;
            while (i<lim) children.push(childnodes[i++]);
            i=0; while (i<lim) {
                // Copy all of the content nodes
                var child=children[i++];
                if (child.nodeType!==1) content.appendChild(child);
                else if ((child.id)&&
                         (child.id.search("METABOOK")===0)) {}
                else if (/(META|LINK|SCRIPT)/gi.test(child.tagName)) {}
                else content.appendChild(child);}}

        var wikiref_pat=/^http(s)?:\/\/([a-z]+.)?wikipedia.org\//;
        // Mark all external anchors and set their targets
        var anchors=content.getElementsByTagName("A");
        var ai=0, alimit=anchors.length; while (ai<alimit) {
            // Use a.getAttribute to not automatically get the
            // base URL added
            var a=anchors[ai++], href=a.getAttribute("href");
            if ((href)&&(href[0]!=="#")&&
                (href.search(/^[a-zA-Z][a-zA-Z][a-zA-Z]+:/)===0)) {
                var aclass=a.className, extclass="extref";
                if (href.search(wikiref_pat)===0) {
                    var text=fdjt.DOM.textify(a);
                    if (!(isEmpty(text))) {
                        if (!(a.title)) a.title="From Wikipedia";
                        else if (a.title.search(/wikipedia/i)>=0) {}
                        else a.title="Wikipedia: "+a.title;
                        extclass=extclass+" wikiref";}}
                if (aclass) a.className=aclass+" "+extclass;
                else a.className=extclass;
                a.target="_blank";}}
        
        // Interpet links
        var notelinks=getChildren(
            content,"a[rel='sbooknote'],a[rel='footnote'],a[rel='endnote']");
        i=0; lim=notelinks.length; while (i<lim) {
            var ref=notelinks[i++];
            var nref=ref.href;
            if (!(fdjtDOM.hasText(nref))) nref.innerHTML="Note";
            if ((nref)&&(nref[0]==="#")) {
                addClass($ID(nref.slice(1)),"sbooknote");}}
        
        // Append the notes block to the content
        if (notesblock.childNodes.length)
            fdjtDOM.append(content,"\n",notesblock,"\n");
        
        // Initialize cover and titlepage (if specified)
        metaBook.coverpage=metaBook.getCoverPage();
        metaBook.titlepage=$ID("SBOOKTITLEPAGE");

        var pages=metaBook.pages=$ID("METABOOKPAGES")||
            fdjtDOM("div#METABOOKPAGES");
        var page=metaBook.page=fdjtDOM("div#CODEXPAGE.metabookcontent",pages);
        
        metaBook.body=$ID("METABOOKBODY");
        if (!(metaBook.body)) {
            var cxbody=metaBook.body=
                fdjtDOM("div#METABOOKBODY.metabookbody",content,page);
            if (metaBook.textjustify) addClass(cxbody,"metabookjustify");
            if (metaBook.bodycontrast)
                addClass(cxbody,"metabookcontrast"+metaBook.bodycontrast);
            if (metaBook.bodysize)
                addClass(cxbody,"metabookbodysize"+metaBook.bodysize);
            if (metaBook.bodyfamily)
                addClass(cxbody,"metabookbodyfamily"+metaBook.bodyfamily);
            if (metaBook.bodyspacing)
                addClass(cxbody,"metabookbodyspacing"+metaBook.bodyspacing);
            body.appendChild(cxbody);}
        else metaBook.body.appendChild(page);

        var menu=metaBook.menu=fdjtDOM("div#METABOOKMENU");
        menu.innerHTML=fixStaticRefs(metaBook.HTML.menu);
        fdjtDOM.prepend($ID("METABOOKBODY"),menu);

        // Initialize the margins
        initMargins();
        if (Trace.startup>1)
            fdjtLog("initBody took %dms",fdjtTime()-started);
        metaBook.Timeline.initBody=fdjtTime();}
    metaBook.initBody=initBody;

    function sizeContent(){
        var started=metaBook.sized=fdjtTime();
        var content=metaBook.content, page=metaBook.page, body=document.body;
        var view_height=fdjtDOM.viewHeight();
        var view_width=fdjtDOM.viewWidth();

        // Clear any explicit left/right settings to get at
        //  whatever the CSS actually specifies
        content.style.left=page.style.left='';
        content.style.right=page.style.right='';
        body.style.overflow='hidden';
        // Get geometry
        metaBook.sizeCodexPage();
        var geom=getGeometry(page,page.offsetParent,true);
        var fakepage=fdjtDOM("DIV.codexpage.curpage");
        page.appendChild(fakepage);
        // There might be a better way to get the .codexpage settings,
        //  but this seems to work.
        var fakepage_geom=getGeometry(fakepage,page,true);
        var inner_width=geom.inner_width;
        var inner_height=geom.inner_height;
        // The (-3) is for the three pixel wide border on the right side of
        //  the glossmark
        var page_margin=view_width-inner_width;
        var glossmark_offset=Math.floor(page_margin/2)+fakepage_geom.right_border;
        fdjtDOM.remove(fakepage);
        if (metaBook.CSS.pagerule) {
            metaBook.CSS.pagerule.style.width=inner_width+"px";
            metaBook.CSS.pagerule.style.height=inner_height+"px";}
        else metaBook.CSS.pagerule=fdjtDOM.addCSSRule(
            "div.codexpage",
            "width: "+inner_width+"px; "+
                "height: "+inner_height+"px;");
        if (metaBook.CSS.glossmark_rule) {
            metaBook.CSS.glossmark_rule.style.marginRight=
                (-glossmark_offset)+"px";}
        else metaBook.CSS.glossmark_rule=fdjtDOM.addCSSRule(
            "#CODEXPAGE .glossmark","margin-right: "+
                (-glossmark_offset)+"px;");
        
        var shrinkrule=metaBook.CSS.shrinkrule;
        if (!(shrinkrule)) {
            shrinkrule=fdjtDOM.addCSSRule(
                "body.mbSHRINK #CODEXPAGE,body.mbPREVIEW #CODEXPAGE,body.mbSKIMMING #CODEXPAGE", "");
            metaBook.CSS.shrinkrule=shrinkrule;}
        var sh=view_height-150;
        var vs=(sh/geom.height);
        if (vs>1) vs=1;
        shrinkrule.style[fdjtDOM.transform]="scale("+vs+","+vs+")";

        document.body.style.overflow='';
        if (Trace.startup>1)
            fdjtLog("Content sizing took %dms",fdjtTime()-started);}
    metaBook.sizeContent=sizeContent;
    
    /* Margin creation */

    function initMargins(){
        var page_right=fdjtDOM("div.mbpagecontrol#MBPAGERIGHT");
        var page_left=fdjtDOM("div.mbpagecontrol#MBPAGELEFT");
        var controls=fdjtDOM("div#METABOOKPAGECONTROLS",page_left,page_right);

        page_left.setAttribute("data-tapsound","METABOOKPAGEBACKWARDAUDIO");        
        page_right.setAttribute("data-tapsound","METABOOKPAGEFORWARDAUDIO");

        fdjtDOM.prepend(document.body,controls);

        window.scrollTo(0,0);
    }
})();

/* Emacs local variables
   ;;;  Local variables: ***
   ;;;  compile-command: "cd ..; make" ***
   ;;;  indent-tabs-mode: nil ***
   ;;;  End: ***
*/
