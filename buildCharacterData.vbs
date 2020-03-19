'Windows use /, linux use \
pathSeparator = "/"

Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
'Remove from last slash.  pathSeparator is set above, but this variabe comes with backslahses even on windows
filePathArr = Split(scriptDir, "\")
For i = 0 to uBound(filePathArr) - 1
     d2Dir = d2Dir & filePathArr(i) & "\"
Next
'Walk through stash folder to get a list of files and put into an array
d2StashDir = d2Dir & pathSeparator & "stash"

If fso.FolderExists(d2StashDir) Then
	Set objFolder = fso.GetFolder(d2StashDir)
	Set colFiles = objFolder.Files
	ReDim fileListArr(-1)
	For Each objFile in colFiles
		ReDim Preserve fileListArr(UBound(fileListArr) + 1)
		fileListArr(UBound(fileListArr)) = objFile.Name
	Next

	'Now we do some janky shit.  
	'Create a string that defines a js function that returns our file array as an actual array for our code
	'Just a list of the names isn't enough, js can't access local files.  Need to define json objects for the contents of each file

	'Also create a function to get the time the data was generated, so we can warn the user to re-generate if old
	dateTimeGenerated = UnixEpoch
	jsString = "function getCharDataDateTime() {var charDataDateTime = '" & dateTimeGenerated & "'; return charDataDateTime;} function getCharDataArr(){ var charDataArr = {"
	counter = 1
	'Loop each character and build their name->value pair in json format
	For Each charName in fileListArr
	'Read the contents of the target file
	charFilePath = d2StashDir & pathSeparator & charName
	Set objFileToRead = fso.OpenTextFile(charFilePath,1)
	strFileText = objFileToRead.ReadAll()
	objFileToRead.Close
	Set objFileToRead = Nothing
	'Create the name->value pair and insert comma if needed
	If counter = 1 Then
		midString = """" & charName & """:" & strFileText 
	Else
		midString = ",""" & charName & """:" & strFileText
	End If
	'Concat the ongoing string
	jsString = jsString & midString
	counter = counter + 1
	Next

	jsString = jsString & "}; return charDataArr; }"

	'Now let's create a javascript file with this string so we have a function that returns all data to our js code
	Set MyFile = fso.CreateTextFile(scriptDir & pathSeparator & "resources" & pathSeparator & "jsDataFiles" & pathSeparator & "characterData.js", True)
	MyFile.WriteLine(jsString)
	MyFile.Close
Else
	'If they dont have the folder we're in the wrong directory, give warning and aborb
	MsgBox "This tool must be installed in your d2 directory.  For example C:/d2/StashTool/buildCharacterData.vbs"
End If

'function to support injecting dateTime above
Function UnixEpoch
	Dim utc_now, t_diff, objWMIService, colItems, item
	
	Set objWMIService = GetObject("winmgmts:" _
	    & "{impersonationLevel=impersonate}!\\.\root\cimv2")

	'Get UTC time string
	Set colItems = objWMIService.ExecQuery("Select * from Win32_UTCTime")
	For Each item In colItems
		If Not IsNull(item) Then
			utc_now = item.Month & "/" & item.Day & "/" & item.Year & " " _
	    				& item.Hour & ":" & item.Minute & ":" & item.Second
		End If
	Next
	
	'Get UTC offset, not constant due to daylight savings
	t_diff = Abs(DateDiff("h", utc_now, Now()))
	
	'Calculate seconds since start of epoch
	UnixEpoch = DateDiff("s", "01/01/1970 00:00:00", DateAdd("h",t_diff,Now()))
End Function
