/*jshint devel:true */

/* data source: 
	New York City Campaign Finance Board:
	http://www.nyccfb.info/searchabledb/SimpleSearchResult.aspx?election_cycle=2013&cand_id=326&cand_name=de+Blasio%2c+Bill
	http://www.nyccfb.info/searchabledb/AdvancedContributionSearchResult.aspx?ec_id=2009&ec=2009&cand_id=605&cand=Bloomberg,%20Michael%20R&date=&stmt=&stmt_id=&stmt_display=&TransTyp_id=ABC&TransTyp=Monetary%20Contributions
*/


//active data
var donorName = [];
var cCode = [];
var borough = [];
var city = [];
var state = [];
var zips = [];
var occupation = [];
var employer = [];
var amount = [];

var totalContributions = 0;

var dataReady = false;


//main pie colors in regular and highlight
var pieColor = ["#2ecc71","#27ae60"];

//slice colors in regular and highlight
//if number of slices displayed is increased remember to also add new colors
var sliceMainColor = ["#e74c3c","#3498db","#e67e22","#9b59b6","#f1c40f"];
var sliceHighColor = ["#c0392b","#2980b9","#d35400","#8e44ad","#f39c12"];



function loadingContent() {

	var counter = 10591470;

	var countDownTimer = window.setInterval(function(){

		var displayCount = counter.toString();

		$(".count_down").html("$"+displayCount.slice(0,2)+","+displayCount.slice(2,5)+","+displayCount.slice(5,8)+".00");
		if(counter===10595440){
			window.clearInterval(countDownTimer);
		}
		counter+=10;

	},1);
	
}

function prepRadialMenu(){
	var items = document.querySelectorAll('.circle a');

	for(var i = 0, l = items.length; i < l; i++) {
  		items[i].style.left = (38 - 35*Math.cos(-0.5 * Math.PI - 2*(1/l)*i*Math.PI)).toFixed(4) + "%";
  		items[i].style.top = (40 + 35*Math.sin(-0.5 * Math.PI - 2*(1/l)*i*Math.PI)).toFixed(4) + "%";
	}
}

function loadingDone() {


	$("#title").css("visibility","visible").hide();
	$("#logo,#title,#intro,footer").fadeIn(3000);

}

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

function findTop(array){

	var groupedArrayName = [];
	var groupedArrayAmount = [];
	var groupIndex = 0;

	var group = [];

	$.each(array, function(index, value){

		if($.inArray(value,groupedArrayName) !== -1){

			groupedArrayAmount[$.inArray(value,groupedArrayName)] += amount[index];
		}
		else{
			groupedArrayName[groupIndex] = value;
			groupedArrayAmount[groupIndex] = amount[index];
			groupIndex++;
 		}
	});

	if(groupedArrayName[1].length === 1){
		groupedArrayName = fixBorough(groupedArrayName);
	}
	
	$.each(groupedArrayName,function(index, value){

		group.push({
			category: (value !== "" ? groupedArrayName[index]:"UNREPORTED"),
			amount: groupedArrayAmount[index]
		});

	});

	group.sort(function(one,two){
		return two.amount - one.amount;
	});

	//taking only top five for display purposes 
	group = group.slice(0,5);

	return group;
}

function generateKey(topArray){

	$("#key p").remove();

	$("#key").hide();

	$.each(topArray, function(index){
		$("#key").append("<p><span id=textColor"+index+">"+topArray[index].category+"</span> donations totaled <span id=amountColor"+index+">$"+(topArray[index].amount).toFixed(2)+"</span></p>");
		$("#textColor" + index+","+"#amountColor" + index).css({"background":sliceMainColor[index]});
	});


	$("#key").fadeIn(2000);

}


function graphTopData(total,topArray){


	//required to fix a weird duplication glitch with Charts.js
	$("#pieChart").replaceWith("<canvas id=\"pieChart\" width=\"400\" height=\"400\"></canvas>");

	var pieGraphData = [];

	var topTotal = 0;


	//converting the data into an array of objects that Charts.js can understand

	$.each(topArray,function(index){
		pieGraphData.push({
			value: (topArray[index].amount/total),
			color: sliceMainColor[index],
			highlight: sliceHighColor[index],
			label: topArray[index].category
		});

		topTotal += topArray[index].amount;

	});
	

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

	generateKey(topArray);
}


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


	prepRadialMenu();


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

	prepRadialMenu();

	$("#logo,#intro,footer").hide();
	$("#title").css('visibility','hidden');

	var countDown = document.createElement("h2");
	var mainDiv = document.getElementById("chartHolder");
	countDown.setAttribute("class", "count_down");
	countDown.appendChild(document.createTextNode("$10,595,440.00"));
	document.body.insertBefore(countDown,mainDiv);


	$.ajax({
		url: "csv/2013_Campaign_Contributions.csv",
		type: "GET",
		beforeSend: loadingContent,
		success: function (data) {

			//importing the campaign donation data from a 3.5 MB .csv file
			//most taxing step
			//probably should be handled by a backend server but this is FEWD not BEWD!
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

			initializePieChart(totalContributions,pieColor,"$10 Million");

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
		

	$(".menu").mouseenter(function(){
		$(".menu-button").addClass("open");
	});
	$(".menu").mouseleave(function(){
		$(".menu-button").removeClass("open");
	});

	$(".menu-button").on("click",function(e){
		e.preventDefault();
		$(".menu-button").removeClass("pulsate");
		$(".circle").toggleClass("open");
	});
	

	$(".circle a").on("click", function(){
		$(".circle,.menu-button").removeClass("open");

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





