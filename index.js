var GoogleAuth;
var SCOPE_CHECK = 'https://www.googleapis.com/auth/classroom.courses.readonly'
var SCOPE = 'https://www.googleapis.com/auth/classroom.courses.readonly '
    + 'https://www.googleapis.com/auth/classroom.coursework.students.readonly '
    + 'https://www.googleapis.com/auth/drive.file '
var studentDocs = {};
var assignment;
var course;
var oauthToken;
var loadCount = 0;

function CreateCourseButtons(courses) {
    courses.forEach((course) => {
        $('body').append(`<button class="course button is-link" data-id="` + course.teacherFolder.id + `">` + course.name + `</button>`);
    })
    $('.course').unbind().click(function () {
        SetCourse($(this).data('id'));
        $('.course').remove();
    })
}

function SetCourse(id) {
    if (course != undefined) {
        return;
    }
    course = id;
    createPicker(course);
}

function UpdateVisual() {
    for (var key of Object.keys(studentDocs)) {
        if ($('.student-doc[data-docid="' + key + '"]').length == 0) {
            var newDoc = $('.student-doc.template').clone()
            newDoc.removeClass('template')
            newDoc.attr('data-docid', key)
            $('body').append(newDoc)
            newDoc.find('.name').text(studentDocs[key].studentName)
            newDoc.find('img').attr('src', studentDocs[key].icon)
            newDoc.find('a').attr('href', studentDocs[key].link)
        }
        var doc = $('.student-doc[data-docid="' + key + '"]');
        if (studentDocs[key].content != undefined) {
            doc.find('.content').html(studentDocs[key].content.replace(/(\r\n|\r|\n){2,}/g, '$1\n'))
            doc.find('.mod-time').text(timeSince(studentDocs[key].modifiedTime))
        }
    }
}

function UpdatePull() {
    Object.keys(studentDocs).forEach((key) => {
        gapi.client.drive.files.export({
            fileId: key,
            mimeType: 'text/plain',
        }).then(function (response) {
            if (response.body != studentDocs[key].content) {
                studentDocs[key].modifiedTime = response.headers.date;
                studentDocs[key].content = response.body
            }
        });
    });
}



function timeSince(d) {
    var date = Date.parse(d);
    var seconds = Math.floor((new Date() - date) / 1000) + 1;

    var interval = seconds / 31536000;

    if (interval > 1) {
        return Math.floor(interval) + " years";
    }
    interval = seconds / 2592000;
    if (interval > 1) {
        return Math.floor(interval) + " months";
    }
    interval = seconds / 86400;
    if (interval > 1) {
        return Math.floor(interval) + " days";
    }
    interval = seconds / 3600;
    if (interval > 1) {
        return Math.floor(interval) + " hours";
    }
    interval = seconds / 60;
    if (interval > 1) {
        return Math.floor(interval) + " minutes";
    }
    return Math.floor(seconds) + " seconds";
}

function handleClientLoad() {
    gapi.load('client:auth2', loaded);
    gapi.load('picker', loaded);
}

function loaded() {
    loadCount++;
    if (loadCount == 2) {
        initClient();
    }
}

function initClient() {
    gapi.client.init({
        'apiKey': 'AIzaSyDMugkcFYFiuUtTnbXIlCX2dphAnfBTV7Q',
        'clientId': '687421808908-6q3umutrl6q1s7ka31m5l4h8lq3oat1c.apps.googleusercontent.com',
        'discoveryDocs': ['https://classroom.googleapis.com/$discovery/rest?version=v1', 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
        'scope': SCOPE
    }).then(function () {
        GoogleAuth = gapi.auth2.getAuthInstance();
        if (GoogleAuth.isSignedIn.get()) {
            updateSigninStatus();
        } else {
            GoogleAuth.signIn();
        }
        GoogleAuth.isSignedIn.listen(updateSigninStatus);
    });
}

function createPicker(id) {
    var view = new google.picker.DocsView()
        .setIncludeFolders(true)
        .setParent(id)
        .setMimeTypes('application/vnd.google-apps.folder')
        .setSelectFolderEnabled(true)
    var picker = new google.picker.PickerBuilder()
        .setAppId('687421808908')
        .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
        .enableFeature(google.picker.Feature.NAV_HIDDEN)
        .setOAuthToken(oauthToken)
        .addView(view)
        .setCallback(pickerCallback)
        .build();
    picker.setVisible(true);
}

function pickerCallback(data) {
    console.log(data)
    if (data.action == google.picker.Action.PICKED) {
        var fileId = data.docs[0].id;
        gapi.client.drive.files.list({
            q: "'" + fileId + "' in parents"
        }).then(function (response) {
            var studentFiles = response.result.files;
            studentFiles.forEach(file => {
                gapi.client.drive.files.get({
                    fileId: file.id,
                    fields: '*' //fix later
                }).then(function (response) {
                    studentDocs[file.id] = {
                        studentName: response.result.owners[0].displayName,
                        modifiedTime: response.result.modifiedTime,
                        icon: response.result.iconLink,
                        link: response.result.webViewLink
                    }
                    gapi.client.drive.files.export({
                        fileId: file.id,
                        mimeType: 'text/plain',
                    }).then(function (response) {
                        studentDocs[file.id].content = response.body;
                    });
                });
            });
        })
        setInterval(function () {
            UpdatePull();
        }, 10000);
        setInterval(function () {
            UpdateVisual();
        }, 1000);
    }
}

function sendAuthorizedApiRequest() {
    gapi.client.classroom.courses.list({
        //params
    }).then(function (response) {
        CreateCourseButtons(response.result.courses)
    });
}

function updateSigninStatus() {
    var user = GoogleAuth.currentUser.get();
    var isAuthorized = user.hasGrantedScopes(SCOPE_CHECK);
    if (isAuthorized) {
        oauthToken = gapi.client.getToken().access_token
        sendAuthorizedApiRequest();
    } else {
        GoogleAuth.disconnect();
        GoogleAuth.signIn();
    }
}

handleClientLoad();
