if ((typeof _metabook_suppressed === "undefined")||(!(_metabook_suppressed))) {
    if (document.addEventListener) {
	document.addEventListener("load",metaBook.headLoaded);
	document.addEventListener("DOMContentLoaded",metaBook.bodyLoaded);
        window.onload=metaBook.domLoaded();}
    else window.onload=function(evt){metaBook.Setup();};}

/* Emacs local variables
   ;;;  Local variables: ***
   ;;;  compile-command: "cd ..; make" ***
   ;;;  indent-tabs-mode: nil ***
   ;;;  End: ***
*/
