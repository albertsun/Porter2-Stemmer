// Reference Javascript Porter2 Stemmer. This code corresponds to the 2005 revision of
// the porter2 stemmer at http://snowball.tartarus.org/algorithms/english/stemmer.html
//
// The latest version of this code is available at https://github.com/kristopolous/Porter-Stemmer
// The specification from above can be found in the spec directory at that repository.
//
// The license for this work is covered in BSD-License.txt and is incorporated herein by reference.
//
// Let's roll...
//
var stemmer = (function(){

  function dummyDebug() {}

  function realDebug() {
    // console.log(Array.prototype.slice.call(arguments).join(' '));
    console.log(arguments);
  }

  var Porter_RegExp = {
    create: function(parts) {
      return new RegExp(parts.join("|"));
    }
  };

  // Now we start a copy-paste job in the comments, directly
  // from the specifications with the following exceptions:
  //
  //  1. [implicit] means that things had to be done 
  //     implicitly and have no corresponding quote fom
  //
  //  2. Comments preceded by "Implementors Note:" correspond
  //     to comments and their associated code blocks being
  //     done by me, as needed, in order to satisfy some set
  //     of requirements.
  var
    // Define a vowel as one of
    //  a   e   i   o   u   y
    vowel = "[aeiouy]",          

    // [implicit] define a non-vowel
    non_vowel = "[^aeiouy]",          

    // Define a double as one of
    // bb   dd   ff   gg   mm   nn   pp   rr   tt
    double = "[bdfgmnprt]{2}",

    // Define a valid li-ending as one of
    // c   d   e   g   h   k   m   n   r   t
    li_ending = "[cdeghkmnrt]",

    // R1 is the region after the first non-vowel following a vowel, or the   
    // end of the word if there is no such non-vowel. (This definition may    
    // be modified for certain exceptional words — see below.) 

    //
    // R2 is the region after the first non-vowel following a vowel in R1, or 
    // the end of the word if there is no such non-vowel. (See note on R1 and R2.) 
    //
    // Implementors note: R2 is the regex of R1 applied to the match set of R1
    // (capture-subpattern) if R1 exists or is the empty string otherwise.
     
    R1_exception = new RegExp("^(?=gener|commun|arsen)(.*)$", "g"),
    R1_and_R2 = new RegExp(vowel + non_vowel + "(.*)$", "g"),
    
    get_region = function(word) {
      var res = R1_and_R2.exec(word);
      return res ? res[1] : "";
    },


    // Define a short syllable in a word as either (a) a vowel followed by a 
    // non-vowel other than w, x or Y and preceded by a non-vowel, or * (b) 
    // a vowel at the beginning of the word followed by a non-vowel. 
    short_syllable = Porter_RegExp.create([
      non_vowel + "([aeiouy][^aeiouywx])",        // (a)
      "^(" + vowel + non_vowel + ")"              // (b)
    ]);

  // This is the definition of a Word as in the Porter2
  // style of word.  There is a distinct R1 and R2 that
  // is computed in real time as the steps of the
  // algorithm are done
  function Word(init) {
    this.word = String.call(this, init);
  }

  Word.prototype.toString = function() {
    return this.word;
  }
  Word.prototype.replace = function(a1,a2) {
    return new Word(this.word.replace(a1,a2));
  }
  Word.prototype.charAt = function(num) {
    return this.word.charAt(num);
  }
  Word.prototype.match = function(regex) {
    return this.word.match(regex);
  }
  Word.prototype.slice = function(beginslice, endslice) {
    return new Word(this.word.slice(beginslice, endslice));
  }
  Word.prototype.substr = function(start,length) {
    return new Word(this.word.substr(start,length));
  }

  Word.prototype.decompose = function() {
    // If the words begins gener, commun or arsen, 
    // set R1 to be the remainder of the word.
    R1_exception.lastIndex = R1_and_R2.lastIndex = 0;
    var match = R1_exception.exec(this.word) || R1_and_R2.exec(this.word);

    this._R1 = match[1];
    this._R1_index = this.word.length - this._R1.length;

    R1_and_R2.lastIndex = 0;
    match = R1_and_R2.exec(this._R1);
    this._R2 = match[1];
    this._R2_index = this.word.length - this._R2.length;

    return this;
  }

  Word.prototype.recompose = function() {
    return this.word = [
      this.word.substr(0, this._R1_index),
      this._R1.substr(0, this._R2_index - this._R1_index),
      this._R2
    ].join("");
  }

  Word.prototype.R1 = function() {
    return this.decompose()._R1;
  }

  Word.prototype.R2 = function() {
    return this.decompose()._R2;
  }

  Word.prototype.R1_match = function(regex) {
    var ret = this.decompose()._R1.match(regex);

    if(ret !== null) {
      ret.index += this._R1_index;
      ret.input = this.word;
    }

    return ret;
  }

  Word.prototype.R2_match = function(regex) {
    var ret = this.decompose()._R2.match(regex);

    if(ret !== null) {
      ret.index += this._R2_index;
      ret.input = this.word;
    }

    return ret;
  }

  Word.prototype.R1_replace = function(a, b) {
    this._R1 = this.decompose()._R1.replace(a, b);
    return this.recompose();
  }

  Word.prototype.R2_replace = function(a, b) {
    this._R2 = this.decompose()._R2.replace(a, b);
    return this.recompose();
  }

  // >> This marks the end of the Word definition.

  // A word is called short if it ends in a short syllable, and if R1 is null. 
  function is_short(word) {
    return !R1.test(word) && short_syllable.test(word);
  }

  // An apostrophe (') may be regarded as a letter. 
  var letter = "[a-z']";

  // Assume that 
  function longest_suffix(word, set) {
    // console.log(word,set);
    var 
      len = set.length,
      res,
      ix;
      // set.sort(function(a, b) {
        // return b[0].toString().length - a[0].toString().length;
      // });

    for(ix = 0; ix < len; ix++) {
      res = set[ix][0].exec(word);
      if(res !== null) {
        // return word.substr(0, res.index) + set[ix][1];
        return word.replace(set[ix][0], set[ix][1]);
      }
    }

    return word;
  }


  // Implementors note: This is the start of the machinery
  return function (raw_word, debug) {

    if (debug) {
      debugFunction = realDebug;
    } else {
      debugFunction = dummyDebug;
    }

    // If the word has two letters or less, leave it as it is. 
    var two_letters_or_less = new RegExp("^" + letter + "{1,2}$"),
        word = new Word(raw_word);
    debugFunction(word.toString());


    if (two_letters_or_less.test(word)) {
      debugFunction(
        "If the word has two letters or less, leave it as it is.",
        two_letters_or_less,
        word
      );

      return word;
    }


    // Remove initial ', if present.
    if (word.charAt(0) == "'") {
      word = word.slice(1);
      debugFunction("Remove initial ', if present.", "", word);
    }

    // Set initial y, or y after a vowel, to Y
    word = word.replace(/^y/, 'Y');
    word = word.replace(/([aeiouy])y/, "$1Y");

    

    // then establish the regions R1 and R2
    var 
      match,
      R1, 
      R2; 

    // If the words begins gener, commun or arsen, 
    // set R1 to be the remainder of the word.
    match = word.match(/^(?=gener|commun|arsen)(.*)$/);
    if (match !== null) {
      R1 = match[1];
    } else {
      R1 = get_region(word);
    }

    R2 = get_region(R1);

    // Step 0:
    // Search for the longest among the suffixes,
    //
    // '
    // 's
    // 's'
    //
    // and remove if found.
    //
    word = longest_suffix(word, [
      [/'s'$/, "", 3],
      [/'s$/, "", 2],
      [/'$/, "", 1]
    ]);
    debugFunction("after step 0", word.toString());


    // Step 1a:
    // Search for the longest among the following suffixes, and perform 
    // the action indicated. 
    word = longest_suffix(word, [
      // sses, replace by ss 
        [ /sses$/, "ss", 4],

      // ied+   ies*
      // replace by i if preceded by more than one letter, otherwise by 
      // ie (so ties -> tie, cries -> cri) 
        [ /^(.{2,})ie[sd]$/, "$1i", 3 ], 

        [ /^(.{0,1})ie[sd]$/, "$1ie", 3 ], 

      // us+   ss
      // do nothing
        [ /([us]s)$/, "$1", 2 ], 

      // s
      // delete if the preceding word part contains a vowel not immediately 
      // before the s (so gas and this retain the s, gaps and kiwis lose it) 

        // Implementors note: vowel + something else + s
        [ /([aeiouy].+)s$/, "$1", 1 ]
    ]);
    debugFunction("after step 1a", word.toString());

    // Step 1b:
    // Search for the longest among the following suffixes, and perform the action indicated. 
    // R1 = longest_suffix(R1,[

    // ]);
    // word = R1(word, longest_suffix);
    // R1 = longest_suffix(
    // eed   eedly+
    // replace by ee if in R1 
    //
    // ed   edly+   ing   ingly+
    // delete if the preceding word part contains a vowel, and after the deletion:
    // if the word ends at, bl or iz add e (so luxuriat -> luxuriate), or
    // if the word ends with a double remove the last letter (so hopp -> hop), or
    // if the word is short, add e (so hop -> hope)

    // Step 1c:
    // replace suffix y or Y by i if preceded by a non-vowel which is not the first letter 
    // of the word (so cry -> cri, by -> by, say -> say)

    // Step 2:
    // Search for the longest among the following suffixes, and, 
    // if found and in R1, perform the action indicated. 
    //
    R1 = longest_suffix(R1, [
      //  tional:   replace by tion
      [/tional$/, "tion"],

      //  enci:   replace by ence
      [/enci$/, "ence"],

      //  anci:   replace by ance
      [/anci$/, "ance"],

      //  abli:   replace by able
      [/abli$/, "able"],

      //  entli:   replace by ent
      [/entli$/, "ent"],

      //  izer   ization:   replace by ize
      [/izer$/, "ize"],
      [/ization$/, "ize"],

      //  ational   ation   ator:   replace by ate
      [/ational$/, "ate"],
      [/ation$/, "ate"],
      [/ator$/, "ate"],

      //  alism   aliti   alli:   replace by al
      [/alism$/, "al"],
      [/aliti$/, "al"],
      [/alli$/, "al"],

      //  fulness:   replace by ful
      [/fulness$/, "ful"],

      //  ousli   ousness:   replace by ous
      [/ousli$/, "ous"],
      [/ousness$/, "ous"],

      //  iveness   iviti:   replace by ive
      [/iveness$/, "ive"],
      [/|iviti$/, "ive"],

      //  biliti   bli+:   replace by ble
      [/biliti$/, "ble"],
      [/bli$/, "ble"],

      //  ogi+:   replace by og if preceded by l
      [/logi$/, "log"],

      //  fulli+:   replace by ful
      [/fulli$/, "ful"],

      //  lessli+:   replace by less
      [/lessli$/, "less"],

      //  li+:   delete if preceded by a valid li-ending
      [/(?:" + li_ending + ")li/, ""]
    ]);
    debugFunction("after step 2", word.toString());

    // Step 3:
    // Search for the longest among the following suffixes, 
    // and, if found and in R1, perform the action indicated. 
    //
    R1 = longest_suffix(R1, [
      // ational+:   replace by ate
      [/ational$/, "ate"],

      // alize:   replace by al
      [/alize$/,  "al"],

      // icate   iciti   ical:   replace by ic
      [/icate$/, "ic"],
      [/iciti$/, "ic"],
      [/ical$/, "ic"],

      // ful   ness:   delete
      [/ful$/, ""],
      [/ness$/, ""],
    ]);

    R2 = longest_suffix(R2, [
      // ative*:   delete if in R2
      [/ative$/, ""]
    ]);
    debugFunction("after step 3", word.toString());
   
    // Step 4
    // Search for the longest among the following suffixes, and, 
    // if found and in R2, perform the action indicated.
    R2 = R2.replace(/^(.+?)(al|ance|ence|er|ic|able|ible|ant|ement|ment|ent|ou|ism|ate|iti|ous|ive|ize|sion|tion)$/, "$1");
  
    return word.toString();  
  };

})();
