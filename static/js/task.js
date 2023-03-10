/*
 * Requires:
 *     psiturk.js
 *     utils.js
 */

// Initalize psiturk object
var psiTurk = new PsiTurk(uniqueId, adServerLoc, mode);

var mycondition = condition;  // these two variables are passed by the psiturk server process
var mycounterbalance = counterbalance;  // they tell you which condition you have been assigned to
// they are not used in the stroop code but may be useful to you

// All pages to be loaded
var pages = [
	"instructions/instruct-1.html",
	"instructions/instruct-2.html",
	"instructions/instruct-3.html",
	"instructions/instruct-ready.html",
	"demographics.html",
	"stage.html",
	"postquestionnaire.html"
];

// In javascript, defining a function as `async` makes it return  a `Promise`
// that will "resolve" when the function completes. Below, `init` is assigned to be the
// *returned value* of immediately executing an anonymous async function.
// This is done by wrapping the async function in parentheses, and following the
// parentheses-wrapped function with `()`.
// Therefore, the code within the arrow function (the code within the curly brackets) immediately
// begins to execute when `init is defined. In the example, the `init` function only
// calls `psiTurk.preloadPages()` -- which, as of psiTurk 3, itself returns a Promise.
//
// The anonymous function is defined using javascript "arrow function" syntax.
const init = (async () => {
    await psiTurk.preloadPages(pages);
})()

var instructionPages = [ // add as a list as many pages as you like
	"instructions/instruct-1.html",
	"instructions/instruct-2.html",
	"instructions/instruct-3.html",
	"instructions/instruct-ready.html"
];


/********************
* HTML manipulation
*
* All HTML files in the templates directory are requested 
* from the server when the PsiTurk object is created above. We
* need code to get those pages from the PsiTurk object and 
* insert them into the document.
*
********************/

/*********************
* Demo Questionnaire *
*********************/
var demoQuestionnaire = function() {
	psiTurk.showPage("demographics.html");

	var recordDemoResponses = function() {
		$('select').each( function(i, val) {
			var selectId = this.id;
			var selectVal = this.val;
			psiTurk.recordTrialData({'phase':'demographics', selectId:selectVal});		
		});
		
		otherTextField = document.getElementById('otherGender').value;
		console.log("user entered '" + otherTextField + "' as their gender");
		if ( otherTextField != "" && otherTextField != null) {
			psiTurk.recordTrialData({'phase':'demographcis', 'othergender':otherTextField});
		}
	}
	

	$("#next").click( function() {
		recordDemoResponses();
		currentview = new HriTest();
	})
}

/**********************
* HRI Test            *
***********************/
var HriTest = function() {
	var vidon; // time video is presented
	var watchTime = [];
	videoList = ['#test1', '#test2'];
	videoId = videoList.shift();
	

	function start () {
		// show first video & hide the rest
		$(videoId).show();
		$(videoId).trigger('play');
		for (var i = 0; i < videoList.length; ++i) {
			$(videoList[i]).hide();
		}

		vidon = new Date().getTime();
	};

	function next () {
		if (videoList.length == 0) {
			$(videoId).trigger('pause');
			watchTime.push( new Date().getTime() - vidon);
			console.log(watchTime);
			finish();
			return;
		}

		// hide last video
		$(videoId).hide();
		$(videoId).trigger('pause');

		// show next video
		videoId = videoList.shift();
		$(videoId).show();
		$(videoId).trigger('play');

		// disable button until next video is played
		document.getElementById('next').setAttribute('disabled', '');

		// reset video time
		watchTime.push( new Date().getTime() - vidon );
		vidon = new Date().getTime();
	}

	function timeupdate(id) {
		var video = document.getElementById(id);
		if (video == null)
			return;
		
		/* Enabled the next button IF
		 * the current video called the update, the video has 10 or less seconds remaining, and if the button is disabled
		 */
		if ((video.duration - video.currentTime < 10) && (id == videoId.substring(1)) && document.getElementById('next').hasAttribute('disabled')) {
			$('#next').removeAttr('disabled');
			console.log('button enabled by '+id+' at '+video.currentTime + 'seconds');
		}
	}

	function recordExperimentData() {
		psiTurk.recordTrialData({'phase':'HriExperiment', 'status':'submit'});

		for (var i = 0; i < watchTime.length; ++i) {
			var currentVideo = `Video${1}WatchTime`;
			psiTurk.recordTrialData({'phase':'HriExperiment', currentVideo:watchTime[i]});
		}
		
		// depreciated form within HriExperiment()
		// $('select').each( function(i, val) {
		// 	psiTurk.recordUnstructuredData(this.id, this.value);
		// })
	}

	function finish () {
		recordExperimentData();
		currentview = new Questionnaire();
	};

	// Load the stage.html snippet into the body of the page
	psiTurk.showPage('stage.html');
	d3.select("#query").html('<p id="prompt">You can watch the video as many times as you want.</p>');

	// start
	start();
	$("#next").click(function () {
	    next();
	});
	document.getElementById('test1').addEventListener('timeupdate', function () {
		timeupdate('test1');
	});
	document.getElementById('test2').addEventListener('timeupdate', function () {
		timeupdate('test2');
	});
}

/*********************
* Post Questionnaire *
*********************/

var Questionnaire = function() {

	var error_message = "<h1>Oops!</h1><p>Something went wrong submitting your HIT. This might happen if you lose your internet connection. Press the button to resubmit.</p><button id='resubmit'>Resubmit</button>";

	record_responses = function() {

		psiTurk.recordTrialData({'phase':'postquestionnaire', 'status':'submit'});

		$('textarea').each( function(i, val) {
			psiTurk.recordUnstructuredData(this.id, this.value);
		});
		$('select').each( function(i, val) {
			psiTurk.recordUnstructuredData(this.id, this.value);		
		});

	};

	prompt_resubmit = function() {
		document.body.innerHTML = error_message;
		$("#resubmit").click(resubmit);
	};

	resubmit = function() {
		document.body.innerHTML = "<h1>Trying to resubmit...</h1>";
		reprompt = setTimeout(prompt_resubmit, 10000);
		
		psiTurk.saveData({
			success: function() {
			    clearInterval(reprompt); 
                psiTurk.computeBonus('compute_bonus', function(){
                	psiTurk.completeHIT(); // when finished saving compute bonus, the quit
                }); 


			}, 
			error: prompt_resubmit
		});
	};

	// Load the questionnaire snippet 
	psiTurk.showPage('postquestionnaire.html');
	psiTurk.recordTrialData({'phase':'postquestionnaire', 'status':'begin'});
	
	$("#next").click(function () {
	    record_responses();
	    psiTurk.saveData({
            success: function(){
                psiTurk.computeBonus('compute_bonus', function() { 
                	psiTurk.completeHIT(); // when finished saving compute bonus, the quit
                }); 
            }, 
            error: prompt_resubmit});
	});
    
	
};

// Task object to keep track of the current phase
var currentview;

/*******************
 * Run Task
 ******************/
 // In this example `task.js file, an anonymous async function is bound to `window.on('load')`.
 // The async function `await`s `init` before continuing with calling `psiturk.doInstructions()`.
 // This means that in `init`, you can `await` other Promise-returning code to resolve,
 // if you want it to resolve before your experiment calls `psiturk.doInstructions()`.

 // The reason that `await psiTurk.preloadPages()` is not put directly into the
 // function bound to `window.on('load')` is that this would mean that the pages
 // would not begin to preload until the window had finished loading -- an unnecessary delay.
$(window).on('load', async () => {
    await init;
    psiTurk.doInstructions(
    	instructionPages, // a list of pages you want to display in sequence
    	function() { currentview = new demoQuestionnaire(); } // what you want to do when you are done with instructions
    );
});
