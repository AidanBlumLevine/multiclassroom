var GoogleAuth;
var SCOPE_CHECK = 'https://www.googleapis.com/auth/classroom.courses.readonly'
var SCOPE = 'https://www.googleapis.com/auth/classroom.courses.readonly '
    + 'https://www.googleapis.com/auth/classroom.coursework.students.readonly '
    + 'https://www.googleapis.com/auth/drive.readonly '
var studentDocs = {};

function CreateCourseButtons(courses) {
    courses.forEach((course) => {
        $('body').append(`<button class="course button is-link" data-id="` + course.id + `">` + course.name + `</button>`);
        $('.course').click((e) => {
            SetCourse($(e.target).data('id'));
            $('.course').remove();
        })
    })
}

function CreateAssignmentButtons(courseWork) {
    courseWork.forEach((cw) => {
        $('body').append(`<button class="work button is-link" data-folderid="` + cw.assignment.studentWorkFolder.id + `">` + cw.title + `</button>`);
        $('.work').click((e) => {
            SetAssignment($(e.target).data('folderid'));
            $('.work').remove();
        })
    })
}

function SetAssignment(id) {
    gapi.client.drive.files.list({
        q: "'" + id + "' in parents"
    }).then(function (response) {
        var studentFiles = response.result.files;
        studentFiles.forEach(file => {
            gapi.client.drive.files.get({
                fileId: file.id,
                fields: '*' //fix later
            }).then(function (response) {
                console.log(response)
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
                    studentDocs[file.id].content = response.body
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

function UpdateVisual() {
    for (var key of Object.keys(studentDocs)) {
        if ($('.student-doc[data-docid="' + key + '"]').length == 0) {
            var newDoc = $('.student-doc.template').clone()
            newDoc.removeClass('template')
            newDoc.attr('data-docid',key)
            $('body').append(newDoc)
            newDoc.find('.name').text(studentDocs[key].studentName)
            newDoc.find('img').attr('src',studentDocs[key].icon)
            newDoc.find('a').attr('href',studentDocs[key].link)
        }
        var doc = $('.student-doc[data-docid="' + key + '"]');
        doc.find('.content').html(studentDocs[key].content.replace(/\n/g, '<br/>'))
        doc.find('.mod-time').text(timeSince(studentDocs[key].modifiedTime))
    }
}

function UpdatePull() {
    for (var key of Object.keys(studentDocs)) {
        gapi.client.drive.files.export({
            fileId: key,
            mimeType: 'text/plain',
        }).then(function (response) {
            if (response.body != studentDocs[key].content) {
                studentDocs[key].modifiedTime = response.headers.date;
                studentDocs[key].content = response.body
            }
        });
    }
}

function SetCourse(id) {
    gapi.client.classroom.courses.courseWork.list({
        courseId: id
    }).then(function (response) {
        CreateAssignmentButtons(response.result.courseWork)
    })
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
    gapi.load('client:auth2', initClient);
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
        sendAuthorizedApiRequest();
    } else {
        GoogleAuth.disconnect();
        GoogleAuth.signIn();
    }
}

handleClientLoad();
// fetch('http://example.com/movies.json')
//   .then(response => response.json())
//   .then(data => $(body).append(data));
