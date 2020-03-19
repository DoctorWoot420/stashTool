'Windows use /, linux use \
pathSeparator = "\"

Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
'Get currnet path by removing 10 chars for /stashTool to get root d2 dir
d2Dir = Mid(scriptDir,1,Len(scriptDir)-10)

'Walk through stash folder to get a list of files and put into an array
d2StashDir = d2Dir & pathSeparator & "stash"
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
jsString = "function getCharDataArr(){ var charDataArr = {"
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
