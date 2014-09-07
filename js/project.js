/*jshint devel:true */

/* data source: 
	New York City Campaign Finance Board:
	http://www.nyccfb.info/searchabledb/SimpleSearchResult.aspx?election_cycle=2013&cand_id=326&cand_name=de+Blasio%2c+Bill
	http://www.nyccfb.info/searchabledb/AdvancedContributionSearchResult.aspx?ec_id=2009&ec=2009&cand_id=605&cand=Bloomberg,%20Michael%20R&date=&stmt=&stmt_id=&stmt_display=&TransTyp_id=ABC&TransTyp=Monetary%20Contributions
*/


//source data is split by category and stored in these arrays for easier processing
var donorName = [];
var cCode = [];
var borough = [];
var city = [];
var state = [];
var zips = [];
var occupation = [];
var employer = [];
var amount = [];

//global variable that store the sum of all donatios
var totalContributions = 0;

var dataReady = false;


//main pie colors in regular and highlight
var pieColor = ["#2ecc71","#27ae60"];

//slice colors in regular and highlight
//if number of slices displayed is increased remember to also add new colors
var sliceMainColor = ["#e74c3c","#3498db","#e67e22","#9b59b6","#f1c40f"];
var sliceHighColor = ["#c0392b","#2980b9","#d35400","#8e44ad","#f39c12"];


//fade reveal divs when loading is complete 
function loadingDone() {
	$('#loadingSpinner').fadeOut("fast");
	$("#title").css("visibility","visible").hide();
	$("#logo,#title,#subtitleAmount,#intro,footer").fadeIn(3000);
}

//initalizes the pie chart by handing Charts.js one slice equal to the total
function initializePieChart(total,color,label){
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

//source data listed Boroughs as single letter codes
//this expands the grouped array without modifying the original array or source data
function fixBorough(boroughArray){
	$.each(boroughArray, function(index, value){
		switch(value){
			case "M":
				boroughArray[index] = "MANHATTAN";
				break;
			case "Z":
				boroughArray[index] = "OUTSIDE NYC";
				break;
			case "K":
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
			case "":
				boroughArray[index] = "UNREPORTED";
				break;
		}

	});
	return boroughArray;
}
// takes and array and groups duplicate items (using string equality)
// sums campaign amounts for groups and returns an object array with top five items
function findTop(array){

	var groupedArrayName = [];
	var groupedArrayAmount = [];
	var groupIndex = 0;

	var group = [];

	$.each(array, function(index, value){

		//is value already in array? then add the amount of the current value to first matching value
		if($.inArray(value,groupedArrayName) !== -1){

			groupedArrayAmount[$.inArray(value,groupedArrayName)] += amount[index];
		}
		//if value is not in array, add new value to group array and add amount
		else{
			groupedArrayName[groupIndex] = value;
			groupedArrayAmount[groupIndex] = amount[index];
			//move up group array
			groupIndex++;
 		}
	});


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
function searchForSlice(array,query){

	var total = 0;

	$.each(array, function(index, value){
		if (value === query){
			total += amount[index];
		}
	});
	console.log(total);
	return total;

}


//function for graphic a single item
//ideally this would be merged with generic graphic function above

//handles the actual graphing of the data through Charts.js
function graphSingleData(total,slice,label){

	//required to fix a weird duplication glitch with Charts.js
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


//implementing bloomberg data
//needs a lot of work in order to be generic
function bloombergify(){

	//clear variables
	totalContributions = 0;
	while(amount.length > 0) {
    	amount.pop();
	}

	$("#logo,#intro,#key").hide();
	$("#title").css('visibility','hidden');

	$(".menu .circle a").remove();
	$(".menu .circle").append("<a id=\"donors\">Donors</a>");


	$("#majorName").html("Michael Bloomberg");
	$("#majorMoney").html("100");
	$("#majorYear").html("2009");
	$("#logo").css({"background-image":"url(../img/michael.jpg)"});

	$.ajax({
		url: "csv/2009_Campaign_Contributions.csv",
		type: "GET",
		success: function (data) {

			//importing the campaign donation data from a 3.5 MB .csv file
			//most taxing step
			//probably should be handled by a backend server but this is FEWD not BEWD!
			var campaign = $.csv.toArrays(data);

			for(var i=1; i<campaign.length; i++){
				donorName[i-1] = campaign[i][13].toUpperCase();
				cCode[i-1] = campaign[i][14].toUpperCase();
				borough[i-1] = campaign[i][18].toUpperCase();
				city[i-1] = campaign[i][19].toUpperCase();
				state[i-1] = campaign[i][20].toUpperCase();
				zips[i-1] = campaign[i][21];
				occupation[i-1] = campaign[i][22].toUpperCase();
				employer[i-1] = campaign[i][23].toUpperCase();
				amount[i-1] = parseFloat(campaign[i][28]);
			}

			$.each(amount,function(index, value){
				totalContributions += value;

			});


			dataReady = true;

			console.log(totalContributions);
			console.log(donorName[3]);

			var displayCount = totalContributions.toString();
			$(".count_down").html("$"+displayCount.slice(0,3)+","+displayCount.slice(3,6)+","+displayCount.slice(6,9)+".00");

			initializePieChart(totalContributions,pieColor,"");

		},
		complete: loadingDone
	});

	$("#donors").on("click", function(){
		console.log("!!!");
		var sliceValue = searchForSlice(donorName,"BLOOMBERG, MICHAEL R");
		graphSingleData(totalContributions,sliceValue,"BLOOMBERG");
	});

}

$(document).ready(function(){

	$("#logo,#subtitleAmount,#intro,footer").hide();
	$("#title").css('visibility','hidden');


	$.ajax({
		url: "csv/2013_Campaign_Contributions.csv",
		type: "GET",
		success: function (data) {

			//importing the campaign donation data from a 3.5 MB .csv file
			//most taxing step
			//completly abusing the client, this should be handled by a server
			//...but I don't know how to perform the backend processing yet
			var campaign = $.csv.toArrays(data);

			for(var i=1; i<campaign.length; i++){
				// donorName[i-1] = campaign[i][13].toUpperCase();
				// cCode[i-1] = campaign[i][14].toUpperCase();
				borough[i-1] = campaign[i][18].toUpperCase();
				city[i-1] = campaign[i][19].toUpperCase();
				state[i-1] = campaign[i][20].toUpperCase();
				zips[i-1] = campaign[i][21];
				occupation[i-1] = campaign[i][22].toUpperCase();
				employer[i-1] = campaign[i][23].toUpperCase();
				amount[i-1] = parseFloat(campaign[i][28]);
			}

			$.each(amount,function(index, value){
				totalContributions += value;

			});

			dataReady = true;

			initializePieChart(totalContributions,pieColor);

		},
		complete: loadingDone
	});

	$("#bloomberg").on("change",function(){
		if(this.checked === true){
			bloombergify();
		}
		else{
			location.reload();
		}
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

		//id of menu selection is matched to corresponding array
		//'maxDonations' is not an array 
		//instead the program searches through 'amount' array instances of specific value
		if($(this).attr("id") === "maxDonations"){
			var sliceValue = searchForSlice(amount,4950);
			graphSingleData(totalContributions,sliceValue,"MAX DONATIONS");
		}
		else{
			var topArrayReady = findTop(window[$(this).attr("id")]);
			graphTopData(totalContributions,topArrayReady);
			generateKey(topArrayReady);
		}
	});

	//testing for single item search queries 
	$("#enter").on("click", function(){

		var sliceValue = searchForSlice(window[$("#database").val()],$("#query").val().toUpperCase());

		graphSingleData(totalContributions,sliceValue,$("#query").val());

	});


	
});





