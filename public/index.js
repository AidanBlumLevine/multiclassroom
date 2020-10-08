const Diff = require('diff');

var GoogleAuth;
var SCOPE_CHECK = 'https://www.googleapis.com/auth/classroom.courses.readonly'
var SCOPE = 'https://www.googleapis.com/auth/classroom.courses.readonly '
    + 'https://www.googleapis.com/auth/classroom.coursework.students '
    + 'https://www.googleapis.com/auth/drive '
var studentDocs = {};
var assignment;
var course;
function CreateCourseButtons(courses) {
    console.log("Courses: ")
    console.log(courses);
    courses.forEach((course) => {
        $('.course-outer').show().append(`<div class="course button is-primary" data-id="` + course.id + `">` + course.name + `</div>`);
    })
    $('.course').unbind().click(function () {
        $('.header').find('.name').text($(this).text())
        SetCourse($(this).data('id'));
        $('.course-outer').remove();
    })
}

function CreateAssignmentButtons(courseWork) {
    console.log("Coursework: ")
    courseWork.forEach((cw) => {
        var id;
        if ('assignment' in cw) {
            id = cw.assignment.studentWorkFolder.id
        } else {
            id = cw.materials[0].driveFile.driveFile.id
        }
        $('.work-outer').show().append(`<div class="work button is-primary" data-folderid="` + id + `" data-cwid="` + cw.id + `">` + cw.title + `</div>`);
    })
    $('.work').unbind().click(function () {
        $('.header').find('.name').text($('.header').find('.name').text() + ': ' + $(this).text())
        SetAssignment($(this).data('folderid'), $(this).data('cwid'));
        $('.work-outer').remove();
    })
}

function SetAssignment(folderId, courseWorkId) {
    if (assignment != undefined) {
        return;
    }
    assignment = courseWorkId;
    gapi.client.drive.files.list({
        q: "'" + folderId + "' in parents"
    }).then(function (response) {
        var studentFiles = response.result.files;
        studentFiles.forEach((file, index) => {
            gapi.client.drive.files.get({
                fileId: file.id,
                fields: '*' //fix later
            }).then(function (response) {
                studentDocs[file.id] = {
                    studentName: response.result.owners[0].displayName,
                    modifiedTime: response.result.modifiedTime,
                    icon: response.result.iconLink,
                    link: response.result.webViewLink,
                }
            });
            gapi.client.drive.files.export({
                fileId: file.id,
                mimeType: 'text/plain',
            }).then(function (response) {
                studentDocs[file.id].content = response.body;
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
            newDoc.attr('data-docid', key)
            $('.docs-parent').removeClass('template')
            $('.docs-location').append(newDoc)
            newDoc.find('.name').text(studentDocs[key].studentName)
            newDoc.find('img').attr('src', studentDocs[key].icon)
            newDoc.find('a.open').attr('href', studentDocs[key].link)
            newDoc.find('a.preview').data('key', key)
            newDoc.find('a.preview').click(function () {
                var key = $(this).data('key')
                $('.doc-preview').addClass('is-active');
                $('.doc-preview').find('.name').text(studentDocs[key].studentName)
                $('.doc-preview').find('img').attr('src', studentDocs[key].icon)
                $('.doc-preview').find('a.open').attr('href', studentDocs[key].link)
                $('.doc-preview').find('.content').html('');
                var last = studentDocs[key].lastContent
                if (last == undefined) {
                    last = studentDocs[key].content
                }
                var diff = Diff.diffChars(last, studentDocs[key].content)
                diff.forEach((part) => {
                    const color = part.added ? 'green' : part.removed ? 'red' : 'grey';
                    $('.doc-preview').find('.content').append(`<span style='color:` + color + `;'>` + part.value + `</span>`);
                })
                $('.doc-preview').find('.mod-time').text(timeSince(studentDocs[key].modifiedTime))
            })
            newDoc.find('.make-comment').click(function () {
                var clicked = $(this)
                var comment = clicked.parent().parent().find('.grade').val()
                if (comment == "") {
                    return;
                }
                gapi.client.drive.comments.create({
                    fileId: key,
                    fields: "*",
                    content: comment
                }, {
                    'content': comment
                }
                ).then(() => {
                    clicked.parent().parent().find('.comment').removeClass('is-warning')
                })
            })
            $('.comment').on('input', function (e) {
                $(this).addClass('is-warning')
            })
        }
        var doc = $('.student-doc[data-docid="' + key + '"]');
        if (studentDocs[key].content != undefined) {
            doc.find('.content').html('');
            var last = studentDocs[key].lastContent
            if (last == undefined) {
                last = studentDocs[key].content
            }
            var diff = Diff.diffChars(last, studentDocs[key].content)
            diff.forEach((part) => {
                const color = part.added ? 'green' : part.removed ? 'red' : 'grey';
                doc.find('.content').append(`<span style='color:` + color + `;'>` + part.value + `</span>`);
            })
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
                studentDocs[key].lastContent = studentDocs[key].content + "";
                studentDocs[key].content = response.body;
            }
        });
    });
}

function SetCourse(id) {
    if (course != undefined) {
        return;
    }
    course = id;
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
            RequestSignIn()
        }
        GoogleAuth.isSignedIn.listen(updateSigninStatus);
    });
}

function sendAuthorizedApiRequest() {
    gapi.client.classroom.courses.list({}).then(function (response) {
        CreateCourseButtons(response.result.courses)
    });
}

function updateSigninStatus() {
    var user = GoogleAuth.currentUser.get();
    var isAuthorized = user.hasGrantedScopes(SCOPE_CHECK);
    if (isAuthorized) {
        console.log("GoogleUser:")
        console.log(gapi)
        $('.grant-permissions').hide();
        sendAuthorizedApiRequest();
    } else {
        GoogleAuth.disconnect();
        GoogleAuth.signIn();
    }
}

function RequestSignIn() {
    $('.grant-permissions').show().click(function () {
        GoogleAuth.signIn();
    })
}

handleClientLoad();
$('.modal-close').click(function () {
    $('.modal').removeClass('is-active')
})
$('.work-outer').hide();
$('.course-outer').hide();

$('.search').on('input', function (e) {
    var text = $(this).val()
    $('.student-doc:visible').each(function () {
        console.log($(this).find('.name').text() + ", " + text)
        if ($(this).find('.name').text().includes(text)) {
            console.log("match")
            $(this).removeClass('fade')
        } else {
            $(this).addClass('fade')
            console.log("nom atch")
        }
    })
});