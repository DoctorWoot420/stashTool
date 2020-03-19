$( document ).ready(function() {
	//When document loads we'll fill the stat dropdown with all stats from itemStateCodes.js
	let statCodeArr = getStatCodeArr();
	//Forgot to alpha sort when building it, resort now
	statCodeArr.sort();
	//console.log(statCodeArr);
	var statListHtml = '';
	for (var i=0;i<statCodeArr.length;i++){
		statListHtml += '<a class="statValue" onclick="setFilterValue(\''+ statCodeArr[i] + '\')" href="#">'+ statCodeArr[i] + '</a>';
	}
	$(statListHtml).insertAfter( "#statName" );
	
	var charDataTime = getCharDataDateTime();
	$('#dateTimeReplace').html(timeConverter(charDataTime));
	//If this is more than 1 hour ago, display an alert message and prompt the user to refresh data
	charDataTime = charDataTime * 1000
	const HOUR = 1000 * 60 * 60;
	const anHourAgo = Date.now() - HOUR;
	//console.log('comparing charDataTime('+charDataTime+') to oneHourAgo('+anHourAgo+')');
	if(charDataTime < anHourAgo) {
		$('#oldDataAlert').attr( "style", "display: block !important;" );
	}
	
	bindFilterRemoveClick();
	//Adds a new stat to saved when Add More Stats button clicked
	//Each stat stored in data elements on the span tag to be read for processing the criteria.  Also builds a string for the user to see, and inlcudes a call to enable removal on click
	$('#addStatButton').click(function(e){
		addToStatfilters();
	});

	//Temporary function to build stat data from all available stats
	//outputAllItemStatsToConsole();
});

function bindFilterRemoveClick() {
	//Removes a saved filter when clicked
	$('.savedFilter').click(function(){
	  $(this).remove();
	});
}

//This function supports the filter DD.  Upon clicking a value this sets the val into text field and closes the dropdown.
function setFilterValue(inputValue) {
	$('.dropbtn').html(inputValue);
	$('#statName').val(inputValue);
	hideStatDropdown();
}

function displaySearchResults() {
	//Wrapper function for getting the results.  Clear out the table and load in the searchResults array from function below
	
	//First, let's establish the criteria.  Create an array of each form field that has a value.  Only supporting 1 attribute right now, but will expand.
	var criteriaArr = [];
	if($('#keywordInput').val()) {
		criteriaArr.push({'criteriaName':'Keyword','value':$('#keywordInput').val(),'match':''});
	}
	if($('#itemType').val() && $('#itemType').val() !== 'none') {
		criteriaArr.push({'criteriaName':'Type','value':$('#itemType').val(),'match':''});
	}
	if($('#itemQuality').val() && $('#itemQuality').val() !== 'none') {
		criteriaArr.push({'criteriaName':'Quality','value':$('#itemQuality').val(),'match':''});
	}
	
	//If any stats entered, move them into stat filters for easy addition on next search
	addToStatfilters();
	var allStatsArr = [];
	$('.savedFilter').each(function(index, value) {
		var oneStatArr = [];
		var statName = $(this).attr('data-statName');
		//Don't add to array if we don't have anything
		if(statName) {
			oneStatArr.push(statName);
			var statMin = $(this).attr('data-statMin');
			oneStatArr.push(statMin);
			var statMax = $(this).attr('data-statMax');
			oneStatArr.push(statMax);
			var statMatch = false;
			oneStatArr.push(statMatch);
			allStatsArr.push(oneStatArr);
		}
	});

	if(allStatsArr.length > 0) {
		criteriaArr.push({'criteriaName':'Stats','value':allStatsArr,'match':false});
	}
	//console.log(criteriaArr);
	var searchResults = getSearchResults(criteriaArr);
	$('#resultsTable').find("tr:gt(0)").remove();
	for (i = 0; i < searchResults.length; i++) {
		$('#resultsTable').append('<tr><th scope="row">'+searchResults[i].accountName+'</th><td>'+searchResults[i].charName+'</td><td>'+searchResults[i].itemName+'</td><td>'+searchResults[i].itemType+searchResults[i].qualityStr+'</td><td>'+searchResults[i].itemLevel+'</td><td>'+searchResults[i].itemStatsString+'</td></tr>');
	}
	
}

function getSearchResults(criteriaArr){
	//Get a big array of all character data to search
	charDataArr = getCharDataArr();
	var searchResults = [];
	
	//Basic keyword search.  Add more later
	//console.log(criteriaArr);
	
	//Show the current search criteria in a string
	var searchTextString = '';
	$.each( criteriaArr, function( key, value ) {
		//console.log( value.criteriaName + ' : ' + value.value );
		if(value.criteriaName == 'Stats') {
			searchTextString += '<span class="criteriaText">(Filtered by Stats)</span>';
		}else{
			searchTextString += '<span class="criteriaText"><strong>'+value.criteriaName+':</strong> '+value.value+'</span>';
		}
	});
	$('#searchTextString').html(searchTextString);
	$('#searchedText').attr( "style", "display: block !important;" );
	
	//Loop the character data and search each node for our keyword
	for (const fileName in charDataArr) {
		var charDataObj = charDataArr[fileName];
		//Loop the items for this character
		for (const itemObjName in charDataObj) {
			//Build out our item attributes to be checked
			var itemObj = charDataObj[itemObjName];
			//Some mats and such don't have item names, so item name is type.  If we don't have a name set, use type as name.
			if (charDataObj[itemObjName].hasOwnProperty('name')) {
				var itemName = cleanseText(charDataObj[itemObjName].name);
			}else{
				//We also have runewords to consider, if we have a runeword value use that as name
				if (charDataObj[itemObjName].hasOwnProperty('runeword')) {
					var itemName = cleanseText(charDataObj[itemObjName].runeword+' (Runeword)');
				}else{
					//Final assumption is name = type
					var itemName = cleanseText(charDataObj[itemObjName].type);
				}
			}
			//We're going to change BAS/EXC/ELI to readable names with style
			itemName = itemName.replace(' BAS',' <span class="itemTier BAS">(Basic)</span>');
			itemName = itemName.replace(' EXC',' <span class="itemTier EXC">(Exceptional)</span>');
			itemName = itemName.replace(' ELI',' <span class="itemTier ELI">(Elite)</span>');
			
			var itemType = cleanseText(charDataObj[itemObjName].type);
			var itemQuality = charDataObj[itemObjName].quality;
			var itemLevel = charDataObj[itemObjName].iLevel;
			
			//We're going to just check each attribute and look for our keyword.
			//Create a formatted string of all item stats with line breaks while we go
			var itemStatsString = '';
			var statsStringsToSearch = '';
			//Keywords to search starts with itemName+itemType, gets stat names/vals injected below
			var keywordStringToSearch = itemName+itemType;
			var minMaxStr = '';
			//Json and undo so we dont modify original criteriaArr.  Probably better solution, annoyed and taking this route out
			var criteriaJson = JSON.stringify(criteriaArr);
			var criteriaResults = JSON.parse(criteriaJson);
			var criteriaNum;
			var statCriteriaNum = 'undefined';
			//lazy copy paste to get startArrNum
			for (criteriaNum = 0; criteriaNum < criteriaResults.length; criteriaNum++) {
				switch(criteriaResults[criteriaNum].criteriaName) {
					case 'Stats':
						//For stats we could have multiple stats to check against.  We assume that we have a match on everything, until one of the checks goes wrong below.  Then just abort the loop and move to next item.
						statCriteriaNum = criteriaNum;
					break;
				}
			}
			
			for (const itemAttr in itemObj) {
				if(itemAttr == 'stats') {
					//Now we need to loop each stat for this item.  We'll do 2 things during the loop:
					//(1) Build some html to display in search results if we have a match (2) Perform all criteria checks and capture their status.
					//Once complete we check the status of all criteria and only include this item if all criteriaResults[criteriaNum].match = true
					
					for (const statNum in itemObj[itemAttr])  {
						//console.log(itemObj[itemAttr][statNum].name);
						//Check if we have min/max values for this stat and create a string for it to concat below
						minMaxStr = '';
						if(typeof itemObj[itemAttr][statNum].range !== 'undefined') {
							minMaxStr = ' &nbsp; | &nbsp;  <span class="minMax">(Range: '+itemObj[itemAttr][statNum].range.min+' - '+itemObj[itemAttr][statNum].range.max+')</span>';
						}
						//Check if we have a skill attribute and add that too
						if(typeof itemObj[itemAttr][statNum].skill !== 'undefined') {
							itemStatsString = itemStatsString+'<strong>'+itemObj[itemAttr][statNum].skill+':</strong>&nbsp;&nbsp;'+itemObj[itemAttr][statNum].value+minMaxStr+'<br />';
							statsStringsToSearch = statsStringsToSearch + itemObj[itemAttr][statNum].name + itemObj[itemAttr][statNum].value + itemObj[itemAttr][statNum].skill;
						}else{
							//If not just make the concatonated string of stat names/values if present
							if(typeof itemObj[itemAttr][statNum].name !== 'undefined') {
								if(typeof itemObj[itemAttr][statNum].value == 'undefined') {
									itemObj[itemAttr][statNum].value = '';
								}
								statsStringsToSearch = statsStringsToSearch + itemObj[itemAttr][statNum].name + itemObj[itemAttr][statNum].value;
								itemStatsString = itemStatsString+'<strong>'+itemObj[itemAttr][statNum].name+':</strong>&nbsp;&nbsp;'+itemObj[itemAttr][statNum].value+minMaxStr+'<br />';
							}
						}
						
						//Now check if we have stat criteria to check this stat against.

						var statArrNum;
						if(statCriteriaNum !== 'undefined') {
							//console.log(criteriaResults[statCriteriaNum]);
							for(statArrNum = 0; statArrNum < criteriaResults[statCriteriaNum].value.length; statArrNum++) {
								//console.log(criteriaResults[statCriteriaNum].value[statArrNum]);
								//console.log(itemObj[itemAttr][statNum]);
								if(typeof itemObj[itemAttr][statNum].name !== 'undefined' && criteriaResults[statCriteriaNum].value[statArrNum][0].toLowerCase() == itemObj[itemAttr][statNum].name.toLowerCase()) {
									//console.log('Matched this item on '+criteriaResults[statCriteriaNum].criteriaName+' criteria');
									//console.log(criteriaResults[statCriteriaNum].value[statArrNum][1]);
									//Now we've assumed it's a match, but need to check the min/max value criteria if present.  Let's just loop it again and check, then set match to false if needed
									criteriaResults[statCriteriaNum].value[statArrNum][3] = true;
									//Stat Min
									if(typeof(criteriaResults[statCriteriaNum].value[statArrNum][1]) !== 'undefined' && criteriaResults[statCriteriaNum].value[statArrNum][1] !== '') {
										if(criteriaResults[statCriteriaNum].value[statArrNum][1] <=  itemObj[itemAttr][statNum].value) {
											//console.log('Within parameters, we have a Stat Min match');
											//console.log(criteriaResults);
										}else{
											console.log('Failed Min stat match.  criteria was('+criteriaResults[statCriteriaNum].value[statArrNum][1]+') and value was ('+itemObj[itemAttr][statNum].value+')');
											criteriaResults[statCriteriaNum].value[statArrNum][3] = false;
										}
									}
									//Stat Max
									if(typeof(criteriaResults[statCriteriaNum].value[statArrNum][2]) !== 'undefined' && criteriaResults[statCriteriaNum].value[statArrNum][2] !== '') {
										if(criteriaResults[statCriteriaNum].value[statArrNum][2] >=  itemObj[itemAttr][statNum].value) {
											//console.log('Within parameters, we have a Stat Max match');
										}else{
											console.log('Failed Max stat match.  criteria was('+criteriaResults[statCriteriaNum].value[statArrNum][2]+') and value was ('+itemObj[itemAttr][statNum].value+')');
											criteriaResults[statCriteriaNum].value[statArrNum][3] = false;
										}
									}
								}
							}
						}	
						
					}
					if(statCriteriaNum !== 'undefined') {
						//Now check each of the stats to make sure we have match = true, otherwise stats is match false
						setToFalse = false;
						$.each( criteriaResults[statCriteriaNum].value, function( key, value ) {
							//for each stat check the match status
							if(value[3] !== true) {
								setToFalse = true;
							}
						});
						if(setToFalse) {
							criteriaResults[statCriteriaNum].match = false;	
						}else{
							criteriaResults[statCriteriaNum].match = true;	
							//console.log('stats checks have matched!');
							console.log(itemObj[itemAttr]);
						}
					}
					
					keywordStringToSearch = keywordStringToSearch + statsStringsToSearch;
				}else{
					keywordStringToSearch = keywordStringToSearch + "" + itemObj[itemAttr];
				}
			}
			
			//Let's loop our criteria and perform any checks that are once per item like keyword and quality
			var criteriaNum;
			for (criteriaNum = 0; criteriaNum < criteriaResults.length; criteriaNum++) {
				switch(criteriaResults[criteriaNum].criteriaName) {
					case 'Keyword':
						if(keywordStringToSearch.toLowerCase().indexOf(criteriaResults[criteriaNum].value.toLowerCase()) !== -1) {
							criteriaResults[criteriaNum].match = true;
							//console.log('Matched this item on '+criteriaResults[criteriaNum].criteriaName+' criteria using searching for this keyword ('+keywordStringToSearch+') within the string ('+criteriaResults[criteriaNum].value.toLowerCase()+')');
							//console.log(criteriaResults);
						}
					break;
					case 'Type':
						console.log('Comparing for type ('+criteriaResults[criteriaNum].value+')   vs ('+itemType+')');
						if(itemType.toLowerCase().indexOf(' '+criteriaResults[criteriaNum].value.toLowerCase()) !== -1) {
							criteriaResults[criteriaNum].match = true;
							console.log('Matched this item on '+criteriaResults[criteriaNum].criteriaName+' criteria');
							//console.log(criteriaResults);
						}
					break;
					case 'Quality':
						//console.log('Comparing for quality ('+criteriaResults[criteriaNum].value+')   vs ('+itemQuality+')');
						if(criteriaResults[criteriaNum].value == itemQuality) {
							criteriaResults[criteriaNum].match = true;
							//console.log('Matched this item on '+criteriaResults[criteriaNum].criteriaName+' criteria');
							//console.log(criteriaResults);
						}
					break;
				}
			}
			//console.log('criteria results');
			//console.log(criteriaResults);
			//Now we verify if all of criteriaResults is matched, and if so include the result in our searchResults array.  Assume it's a match until we find a piece of criteria not met.
			var itemMatched = true;
			$.each( criteriaResults, function( key, value ) {
				if(value.match) {
					//console.log('Successfully match for this item based on '+value.criteriaName+' criteria.  We have value.match='+value.match);
				}else{
					//console.log('Failed match for this item based on '+value.criteriaName+' criteria.  We have value.match='+value.match);
					itemMatched = false;
				}
			});
			if(itemMatched) {
				//Before we inject the result see if we have item quality to show.
				var qualityStr = ''; 
				if(typeof(charDataObj[itemObjName].quality) !== 'undefined') {
					qualityStr = ' <span class="quality '+charDataObj[itemObjName].quality+'">('+charDataObj[itemObjName].quality+')</span>';
				}
				//Let's also split the fileName into account and character
				accountName = fileName.substring(0,fileName.indexOf('_'));
				//Trim the .txt from charName
				var charName = fileName.substring(fileName.indexOf('_')+1)
				charName = charName.replace('.txt','');
				
				searchResults.push({'accountName':accountName,'charName':charName,'itemObj':itemObj,'itemName':itemName,'itemType':itemType,'itemLevel':itemLevel,'itemStatsString':itemStatsString,'qualityStr':qualityStr});
			}
			criteriaresults = [];
		}
	}
	//Now let's update result count
	$('#resultString').html(searchResults.length);
	$('#resultCount').attr( "style", "display: block !important;" );
	return searchResults;
}

function addToStatfilters() {
	var statArr = [];
	var statName = '';
	var statMin = '';
	var statMax = '';
	if($('#statName').val() && $('#statName').val() !== 'undefined' && $('#statName').val() && $('#statName').val() !== 'none') {
		statArr.push({'criteriaName':'Stat','value':$('#statName').val(),'match':''});
		statName = $('#statName').val();
	}
	if($('#statMin').val()) {
		statArr.push({'criteriaName':'Stat Min','value':$('#statMin').val(),'match':''});
		statMin = $('#statMin').val();
	}
	if($('#statMax').val()) {
		statArr.push({'criteriaName':'Stat Max','value':$('#statMax').val(),'match':''});
		statMax = $('#statMax').val();
	}
	//Generate a string of the 3 stat criteria seperated by pipelines, then display on page under stat filters
	var statString = statName;
	var statHtml = '';
	if(!statMin && statMax) {
		statString = statString+' < '+statMax;
	}
	if(statMin && !statMax) {
		statString = statString+' > '+statMin;
	}
	if(statMin && statMax) {
		statString = statString+' '+statMin+'-'+statMax;
	}
	if(statString) {
		statHtml = '<span class="savedFilter" data-toggle="tooltip" title="Remove stat from filter" data-statName="'+statName+'" data-statMin="'+statMin+'" data-statMax="'+statMax+'">'+statString+'</span>';
		$("#filterContainer").append(statHtml);
		bindFilterRemoveClick();
		$('#savedFilterLabel').show();
		$('#statName').val('');
		$('.dropbtn').html('Select a Stat');
		$('#statMin').val('');
		$('#statMax').val('');
	}
}

function cleanseText(inputStr) {
	//Generic function we can pass item names/types through and remove junk text like ÿc4
	var outputStr = inputStr.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
	outputStr = outputStr.replace('yc1','');
	outputStr = outputStr.replace('yc2','');
	outputStr = outputStr.replace('yc3','');
	outputStr = outputStr.replace('yc4','');
	outputStr = outputStr.replace('yc5','');
	outputStr = outputStr.replace('yc6','');
	outputStr = outputStr.replace('yc7','');
	outputStr = outputStr.replace('yc8','');
	
	return outputStr;
}

function showStatDropdown() {
  document.getElementById("statDropdown").classList.toggle("show");
  $("#statName").focus();
}
function hideStatDropdown() {
  document.getElementById("statDropdown").classList.toggle("show");
}

//Intercept the enter key and execute our search when detected
document.onkeydown=function(evt){
	var keyCode = evt ? (evt.which ? evt.which : evt.keyCode) : event.keyCode;
	if(keyCode == 13)
	{
		displaySearchResults();
	}
}

function filterFunction() {
  var input, filter, ul, li, a, i;
  input = document.getElementById("statName");
  filter = input.value.toUpperCase();
  div = document.getElementById("statDropdown");
  a = div.getElementsByTagName("a");
  for (i = 0; i < a.length; i++) {
    txtValue = a[i].textContent || a[i].innerText;
    if (txtValue.toUpperCase().indexOf(filter) > -1) {
      a[i].style.display = "";
    } else {
      a[i].style.display = "none";
    }
  }
}

function timeConverter(UNIX_timestamp){
  var a = new Date(UNIX_timestamp * 1000);
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var year = a.getFullYear();
  var month = months[a.getMonth()];
  var date = a.getDate();
  var hour = a.getHours();
  var min = a.getMinutes();
  var sec = a.getSeconds();
  var time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec ;
  return time;
}


function outputAllItemStatsToConsole() {
	var charDataArr = getCharDataArr();
	var itemStatString = '';
	var itemStatArr = [];
	for (const fileName in charDataArr) {
		var charDataObj = charDataArr[fileName];
		//Loop the items for this character
		for (const itemObjName in charDataObj) {
			//Build out our item attributes to be checked
			var itemObj = charDataObj[itemObjName];
			
			for (const itemAttr in itemObj) {
				if(itemAttr == 'stats') {
					//Now we need to loop each stat for this item.  We'll do 2 things during the loop:
					//(1) Build some html to display in search results if we have a match (2) Perform all criteria checks and capture their status.
					//Once complete we check the status of all criteria and only include this item if all criteriaResults[criteriaNum].match = true
					
					for (const statNum in itemObj[itemAttr])  {
						if(typeof(itemObj[itemAttr][statNum].name) !== 'undefined') {
							console.log('check for name  "'+itemObj[itemAttr][statNum].name+'"');
							console.log(itemStatArr);
							if(jQuery.inArray( '"'+itemObj[itemAttr][statNum].name+'"', itemStatArr ) !== -1) {
								console.log('already in arr');
							}else{
								console.log('pushed new val');
								itemStatArr.push('"'+itemObj[itemAttr][statNum].name+'"');
							}
						}
					}
				}
			}
		}
	}
	console.log(itemStatArr);
	itemStatString = itemStatArr.join(',');
	$('#specialOutput').html(itemStatString);
}