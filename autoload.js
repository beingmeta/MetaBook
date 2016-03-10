if ((typeof _metabook_suppressed === "undefined")||(!(_metabook_suppressed))) {
    metaBook.appInit();
    if (document.addEventListener) {
	document.addEventListener("load",metaBook.headReady);
	document.addEventListener("DOMContentLoaded",metaBook.bodyReady);
        window.onload=metaBook.domReady;}
    else window.onload=function(evt){metaBook.Setup();};}

/* Emacs local variables
   ;;;  Local variables: ***
   ;;;  compile-command: "cd ..; make" ***
   ;;;  indent-tabs-mode: nil ***
   ;;;  End: ***
*/
