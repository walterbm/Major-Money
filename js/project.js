/*jshint devel:true */

/* data source: 
	New York City Campaign Finance Board:
	http://www.nyccfb.info/searchabledb/SimpleSearchResult.aspx?election_cycle=2013&cand_id=326&cand_name=de+Blasio%2c+Bill
	http://www.nyccfb.info/searchabledb/AdvancedContributionSearchResult.aspx?ec_id=2009&ec=2009&cand_id=605&cand=Bloomberg,%20Michael%20R&date=&stmt=&stmt_id=&stmt_display=&TransTyp_id=ABC&TransTyp=Monetary%20Contributions
*/



//major's campaign data is stored in objects with varying properties for each category
var deBlasio = {};
var bloomberg = {};
var giuliani = {};
var dinkins = {};

//global variable that store the sum of all donatios
var totalContributions = 0;

var dataReady = false;

var majorMode = "deBlasio";


//main pie colors in regular and highlight
var pieColor = ["#2ecc71","#27ae60"];

//slice colors in regular and highlight
//if number of slices displayed is increased remember to also add new colors
var sliceMainColor = ["#e74c3c","#3498db","#e67e22","#9b59b6","#f1c40f"];
var sliceHighColor = ["#c0392b","#2980b9","#d35400","#8e44ad","#f39c12"];


//helper function for isolating the columns on the original data array
function compileColumn(array,column){
	var compiledArray = [];

	for(var i=1; i<array.length; i++){
		compiledArray[i-1] = array[i][column].toUpperCase();
	}

	return compiledArray;
}

//helper function for isolating the columns on the original data array
//separate function to preserve amount as a float
function compileAmount(array){
	var compiledArray = [];

	for(var i=1; i<array.length; i++){
		compiledArray[i-1] = parseFloat(array[i][9]);
	}

	return compiledArray;
}

//helper function simply calculates the total amount of contributions
function getTotalContributions(major){
	totalContributions = 0;

	$.each(major.amount,function(index, value){
		totalContributions += value;
	});

	return totalContributions;
}

//initalizes the pie chart by handing Charts.js one slice equal to the total
function initializePieChart(total,color,label){
	//required to fix a weird duplication glitch with Charts.js
	$("#pieChart").replaceWith("<canvas id=\"pieChart\" width=\"400\" height=\"400\"></canvas>");

	var ctx = document.getElementById("pieChart").getContext("2d");
	var pie = new Chart(ctx);
	var initialData = [
		{
			value: total,
			color:color[0],
			highlight: color[1],
			label: label
		}
	];
	pie.Doughnut(initialData,{segmentShowStroke: false,showTooltips: false,animationEasing: "easeInOutCubic", responsive: true});
}

//fade in divs when loading is complete 
function loadingDone() {

	getTotalContributions(deBlasio);
		
	dataReady = true;

	initializePieChart(totalContributions,pieColor);

	$('#loading').fadeOut("fast");
	$("#title,.majors").css("visibility","visible").hide();
	$("#logo,#title,#subtitleAmount,#intro,footer,.majors").fadeIn(3000);

}

//source data listed Boroughs as single letter codes
//this function expands the display array without modifying the original array or source data
function fixBorough(boroughArray){
	$.each(boroughArray, function(index, value){
		switch(value){
			case "M":
				boroughArray[index] = "MANHATTAN";
				break;
			case "Z":
				boroughArray[index] = "OUTSIDE NYC";
				break;
			//current designation for Brooklyn is "K"
			case "K" :
				boroughArray[index] = "BROOKLYN";
				break;
			//pre 1994 "B" was the designation for Brooklyn
			case "B" :
				boroughArray[index] = "BROOKLYN";
				break;
			case "X":
				boroughArray[index] = "BRONX";
				break;
			case "S":
				boroughArray[index] = "STATEN ISLAND";
				break;
			case "Q":
				boroughArray[index] = "QUEENS";
				break;
			case "" || "U":
				boroughArray[index] = "UNREPORTED";
				break;
		}

	});
	return boroughArray;
}

// takes and array and groups duplicate items (using string equality)
// sums campaign amounts for groups and returns an object array with top five items
function findTop(major,property){

	var groupedArrayName = [];
	var groupedArrayAmount = [];
	var groupIndex = 0;

	var group = [];

	//iterate through major.property array to group values
	for(var i=0; i<major[property].length; i++){
		//is value already in category array? then add the amount of the current value to first matching value
		if($.inArray(major[property][i],groupedArrayName) !== -1){

			groupedArrayAmount[$.inArray(major[property][i],groupedArrayName)] += major.amount[i];
		}
		//if value is not in array, add new value to group array and add amount
		else{
			groupedArrayName[groupIndex] = major[property][i];
			groupedArrayAmount[groupIndex] = major.amount[i];
			//move up group array
			groupIndex++;
 		}
	}

	//test to see if first array value is one character in lenght, if so this must be the borough arrary
	if(groupedArrayName[1].length === 1){
		groupedArrayName = fixBorough(groupedArrayName);
	}
	
	//take group array and convert it into an array of objects
	$.each(groupedArrayName,function(index, value){

		group.push({
			//if value is empty, change it to "UNREPORTED"
			//done here to avoid processing entire array but may have to be moved
			category: (value !== "" ? groupedArrayName[index]:"UNREPORTED"),
			amount: groupedArrayAmount[index]
		});
	});

	//changing the native sort() function to sort the object "group" based on the .amount property and decending order
	group.sort(function(one,two){
		return two.amount - one.amount;
	});

	//taking only top five for display purposes 
	group = group.slice(0,5);

	console.log(group);
	return group;
}

//generate the pie key by inserting paragraph elements into the #key div
function generateKey(topArray){

	//clear key by removing all current paragraph elements
	$("#key p").remove();

	//hide to allow transition
	$("#key").hide();

	//add a new paragraph based on number of object array elemenets
	$.each(topArray, function(index){
		$("#key").append("<p><span id=textColor"+index+">"+topArray[index].category+"</span> donations totaled <span id=amountColor"+index+">$"+(topArray[index].amount).toFixed(2)+"</span></p>");
		$("#textColor" + index+","+"#amountColor" + index).css({"background":sliceMainColor[index]});
	});

	//fade in key once all the paragraph elements have been generated and inserted
	$("#key").fadeIn(2000);
}


function graphTopData(total,topArray){

	//required to fix a weird duplication glitch with Charts.js
	$("#pieChart").replaceWith("<canvas id=\"pieChart\" width=\"400\" height=\"400\"></canvas>");

	var pieGraphData = [];

	var topTotal = 0;


	//converting the object array from the topArray function into an array of objects that Charts.js can understand
	$.each(topArray,function(index){
		pieGraphData.push({
			value: (topArray[index].amount/total),
			color: sliceMainColor[index],
			highlight: sliceHighColor[index],
			label: topArray[index].category
		});

		topTotal += topArray[index].amount;

	});
	
	//calculating the remaing slice
	pieGraphData.push({
		value: ((total-topTotal)/total),
		color: pieColor[0],
		highlight: pieColor[1],
		label: "Other Contributions"
	});


	//Charts.js in action
	var ctx = document.getElementById("pieChart").getContext("2d");
	var pie = new Chart(ctx);
	pie.Doughnut(pieGraphData,{animationEasing:"easeInBack", tooltipTemplate: "<%if (label){%><%=label%>: <%}%> <%= (value*100).toFixed(2) %>%", responsive: true});

	//generating the key once the pie graph is ready
	generateKey(topArray);
}

//simple function that searches for occurences of a specific item in array and sums amounts based on matching index
function searchForSlice(major,property,query){

	var total = 0;

	for(var i=0; i<major[property].length; i++){
		if (major[property][i] === query){
			total += major.amount[i];	
		}
	}

	return total;
}


//function for graphic a single item
//handles the actual graphing of the data through Charts.js
function graphSingleData(total,slice,label){

	//required to fix a duplication glitch with Charts.js
	$("#pieChart").replaceWith("<canvas id=\"pieChart\" width=\"400\" height=\"400\"></canvas>");

	var pieGraphData = [];

	//if no valid data is passed the graph will not display a border to avoid confusion and keep a clean pie
	var emptyPie = (slice > 0 ? true:false);


	//converting the raw values into an array of objects that Charts.js can understand
	pieGraphData.push({
		value: (slice/total),
		color: sliceMainColor[0],
		highlight: sliceHighColor[0],
		label: label
	});

	pieGraphData.push({
		value: ((total-slice)/total),
		color: pieColor[0],
		highlight: pieColor[1],
		label: "Other Contributions"
	});


	//Charts.js in action
	var ctx = document.getElementById("pieChart").getContext("2d");
	var pie = new Chart(ctx);
	pie.Doughnut(pieGraphData,{segmentShowStroke: emptyPie,animationEasing:"easeInBack", tooltipTemplate: "<%if (label){%><%=label%>: <%}%> <%= (value*100).toFixed(2) %>%", responsive: true});

	
	//generate one key for individual queries
	$("#key p").remove();

	$("#key").hide();

	$("#key").append("<p><span>"+(pieGraphData[0].label).toUpperCase()+"</span> donations totaled <span>$"+slice.toFixed(2)+"</span></p>");
	$("#key span").css({"background":sliceMainColor[0]});


	$("#key").fadeIn(2000);

}

function loadAllData(){

	//importing the campaign donation data from a ≈ 4 MB .csv file
	//most taxing step
	//abusing the client, ideally this should be processed by a backend server

	var deBlasioURL = "csv/2013_Campaign_Contributions.csv";
	var bloombergURL = "csv/2009_Campaign_Contributions.csv";
	var giulianiURL = "csv/1994_Campaign_Contributions.csv";
	var dinkinsURL = "csv/1990_Campaign_Contributions.csv";

	$.when(
		$.get(dinkinsURL,function(data){

			var campaign = $.csv.toArrays(data);

			dinkins.borough = compileColumn(campaign,3);
			dinkins.city = compileColumn(campaign,4);
			dinkins.state = compileColumn(campaign,5);
			dinkins.zips = compileColumn(campaign,6);
			dinkins.occupation = compileColumn(campaign,7);
			dinkins.amount = compileAmount(campaign);

			$("#loading").append(".");

		}),
		$.get(giulianiURL,function(data){

			var campaign = $.csv.toArrays(data);

			giuliani.borough = compileColumn(campaign,3);
			giuliani.city = compileColumn(campaign,4);
			giuliani.state = compileColumn(campaign,5);
			giuliani.zips = compileColumn(campaign,6);
			giuliani.occupation = compileColumn(campaign,7);
			giuliani.amount = compileAmount(campaign);

			$("#loading").append(".");

		}),
		$.get(bloombergURL,function(data){

			var campaign = $.csv.toArrays(data);

			bloomberg.donorName = compileColumn(campaign,2);
			bloomberg.borough = compileColumn(campaign,3);
			bloomberg.city = compileColumn(campaign,4);
			bloomberg.state = compileColumn(campaign,5);
			bloomberg.zips = compileColumn(campaign,6);
			bloomberg.occupation = compileColumn(campaign,7);
			bloomberg.employer = compileColumn(campaign,8);
			bloomberg.amount = compileAmount(campaign);

			$("#loading").append(".");

		}),
		$.get(deBlasioURL,function(data){

			var campaign = $.csv.toArrays(data);

			deBlasio.borough = compileColumn(campaign,3);
			deBlasio.city = compileColumn(campaign,4);
			deBlasio.state = compileColumn(campaign,5);
			deBlasio.zips = compileColumn(campaign,6);
			deBlasio.occupation = compileColumn(campaign,7);
			deBlasio.amount = compileAmount(campaign);

			$("#loading").append(".");

		})
		
		).then(loadingDone);
}


$(document).ready(function(){

	$("#logo,#subtitleAmount,#intro,footer").hide();
	$("#title,.majors").css('visibility','hidden');
	

	loadAllData();

	$(".majors").on("click", function(){

		//set major mode to selection based on image #id
		majorMode = $(this).attr("id");

		//calculate new total
		var total = Math.round(getTotalContributions(window[majorMode]));


		//clear graph and key
		initializePieChart(total,pieColor);
		$("#key p").remove();
		$("#key").hide();

		//handle bloomberg special case
		//because bloomberg's only contributor was himself his data is handled diffrently
		//only option shown is "Donor"
		//this hides other options when Bloomberg is selected and hides "Donor" when other majors are selcted
		if( $(this).attr("id") === "bloomberg"){
			$(".menuItems a").hide();
			$("#donors").show();
		}
		else{
			$(".menuItems a").show();
			$("#donors").hide();
		}

		//replace logo, subtitle, and other text to match selected major
		$("#logo").css({"background-image":"url("+$(this).attr("src")+")"});
		$("#subtitleAmount").html("$"+total+".00");
		$("#majorName").html($(this).attr("alt"));
		$("#majorYear").html($(this).attr("data-year"));
		$("#majorMoney").html(total.toString().slice(0,(total.toString().length-6)));

	});



	//bar menu is composed of one container div and one menu item div
	//menu item div is hiden/shown depening on mouse/click event
	//click events are mostly for touch devices	
	$('.menu').on({
		mouseenter: function(){
			$(".menuItems").slideDown();
		},
		mouseleave: function(){
			$(".menuItems").slideUp();
		},
		click: function(){
			if($('.menuItems').is(':hidden')){
				$(".menuItems").slideDown();
			}
			else{
				$('.menuItems').slideUp('slow');
			}
		}
	});

	$(".menuItems a").on("click", function(){
		//pulsate class is just to draw the user's attention on load
		//after first user interaction it's removed
		$('.menu').removeClass('pulsate');

		if($(this).attr("id")==="donors"){
			var sliceValue = searchForSlice(window[majorMode],"donorName","BLOOMBERG, MICHAEL R");
			graphSingleData(getTotalContributions(window[majorMode]),sliceValue,"BLOOMBERG");
		}
		else{
			var topArrayReady = findTop(window[majorMode],$(this).attr("id"));
			graphTopData(totalContributions,topArrayReady);
			generateKey(topArrayReady);
		}
	});

	//testing for single item search queries 
	$("#enter").on("click", function(){

		var sliceValue = searchForSlice(window[majorMode],$("#database").val(),$("#query").val().toUpperCase());
		graphSingleData(getTotalContributions(window[majorMode]),sliceValue,$("#query").val());

	});
	
});





