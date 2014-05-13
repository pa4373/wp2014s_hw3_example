// At least you know how to find the master branch, or ask someone.
(function () {
  Parse.initialize("s4747jSandiQGpXlbizjGZMgXJAepvnGnbc7NCmu",
    "PihDCqy36lpBPQc8rmiEH477nSD0tT1vrSSjBAm0");
  var templates = {};
  ["loginView", "evaluationView", "updateSuccessView"].forEach(function (e) {
    templateCode = document.getElementById(e).text;
    templates[e] = doT.template(templateCode);
  });

  var commons = {
    loginRequiredView: function (ViewFunction) {
      return function () {
        var currentUser = Parse.User.current();
        if (currentUser) {
          ViewFunction();
        } else {
          window.location.hash = "login/" + window.location.hash;
        }
      }
    },
  }

  var handlers = {
    navbar: function () {
      var currentUser = Parse.User.current();
      if (currentUser) {
        document.getElementById("loginButton").style.display = "none";
        document.getElementById("logoutButton").style.display = "block";
        document.getElementById("evaluationButton").style.display = "block";
      } else {
        document.getElementById("loginButton").style.display = "block";
        document.getElementById("logoutButton").style.display = "none";
        document.getElementById("evaluationButton").style.display = "none";
      }
      document.getElementById("logoutButton").addEventListener('click', function () {
        Parse.User.logOut();
        handlers.navbar();
        window.location.hash = 'login/';
      });
    },
    evaluationView: commons.loginRequiredView(function () {
      var Evaluation = Parse.Object.extend('Evaluation');
      var currentUser = Parse.User.current();      
      var evaluationACL = new Parse.ACL();
      evaluationACL.setPublicReadAccess(false);
      evaluationACL.setPublicWriteAccess(false);
      evaluationACL.setReadAccess(currentUser, true);
      evaluationACL.setWriteAccess(currentUser, true);
      var query = new Parse.Query(Evaluation);
      query.equalTo('user', currentUser);
      query.first({
        success: function(evaluation){
          window.EVAL = evaluation;
          if(evaluation === undefined){
            var TeamMembers = TAHelp.getMemberlistOf(currentUser.get('username')).filter(function(e){
              return (e.StudentId !== currentUser.get('username') ) ? true : false;
            }).map(function(e){
              e.scores = ['0', '0', '0', '0'];
              return e;
            });
          } else {
            var TeamMembers = evaluation.toJSON().evaluations;
          }
          document.getElementById('content').innerHTML = templates.evaluationView(TeamMembers);
          document.getElementById('evaluationForm-submit').value = ( evaluation === undefined ) ? '送出表單' :'修改表單';
          document.getElementById('evaluationForm').addEventListener('submit', function(){
            for(var i = 0; i < TeamMembers.length; i++){
              for(var j = 0; j < TeamMembers[i].scores.length; j++){
                var e = document.getElementById('stu'+TeamMembers[i].StudentId+'-q'+j);
                var amount = e.options[e.selectedIndex].value;
                TeamMembers[i].scores[j] = amount;
              }
            }
            if( evaluation === undefined ){
              evaluation = new Evaluation();
              evaluation.set('user', currentUser);
              evaluation.setACL(evaluationACL);
            }
            console.log(TeamMembers);
            evaluation.set('evaluations', TeamMembers);
            evaluation.save(null, {
              success: function(){
                document.getElementById('content').innerHTML = templates.updateSuccessView();
              },
              error: function(){},
            });

          }, false);
        }, error: function(object, err){
        
        }
      }); 
    }),
    loginView: function (redirect) {
      var checkVaildStudentID = function(DOM_ID) {
        var student_ID = document.getElementById(DOM_ID).value;
        return (TAHelp.getMemberlistOf(student_ID) === false) ? false : true;
      }
      var showMessage = function(DOM_ID, fn, msg) {
        if (!fn()) {
          document.getElementById(DOM_ID).innerHTML = msg;
          document.getElementById(DOM_ID).style.display = "block";
        } else {
          document.getElementById(DOM_ID).style.display = "none";
        }
      }
      var postAction = function() {
        handlers.navbar();
        window.location.hash = (redirect) ? redirect : '';
      }
      var passwordMatch = function(){
        var singupForm_password = document.getElementById('form-signup-password');
        var singupForm_password1 = document.getElementById('form-signup-password1');
        var BOOL = (singupForm_password.value === singupForm_password1.value) ? true : false;
        showMessage('form-signup-message', function(){return BOOL;}, 'Passwords don\'t match.');
        return BOOL;
      }

      document.getElementById("content").innerHTML = templates.loginView();
      document.getElementById("form-signin-student-id").addEventListener("keyup", function () {
        showMessage('form-signin-message', function(){return checkVaildStudentID("form-signin-student-id")}
            , 'The student is not one of the class students.');
      });
      document.getElementById("form-signin").addEventListener("submit", function () {
        if (!checkVaildStudentID("form-signin-student-id")) {
          alert("The student is not one of the class students.");
          return false;
        }
        Parse.User.logIn(document.getElementById("form-signin-student-id").value,
          document.getElementById("form-signin-password").value, {
            success: function(user) {
              postAction();
            },
            error: function (user, error) {
              showMessage('form-signin-message', function () {
                return false;
              }, "Invaild username or password.");
            }
          });
      }, false);

      document.getElementById("form-signup-student-id").addEventListener("keyup", function () {
        showMessage('form-signup-message', function(){return checkVaildStudentID("form-signup-student-id")}
            , 'The student is not one of the class students.');
      });
      document.getElementById("form-signup-password1").addEventListener('keyup', passwordMatch);
      document.getElementById("form-signup").addEventListener("submit", function (){
        if (!checkVaildStudentID('form-signup-student-id')){
          alert("The student is not one of the class students."); 
          return false;
        }
        var BOOL = passwordMatch();
        if(!BOOL){
          return false;
        }

        var user = new Parse.User();
        user.set("username", document.getElementById('form-signup-student-id').value);
        user.set("password", document.getElementById('form-signup-password').value);
        user.set("email", document.getElementById('form-signup-email').value);
        user.signUp(null, {
          success: function(user){
            postAction();
          },
          error: function(user, error){
            showMessage('form-signup-message', function () {
              return false;
            }, error.message);
          }
        });
      }, false);
    }
  };

  var Router = Parse.Router.extend({
    routes: {
      "": "indexView",
      "peer-evaluation/": "evaluationView",
      "login/*redirect": "loginView",
    },
    indexView: handlers.evaluationView,
    evaluationView: handlers.evaluationView,
    loginView: handlers.loginView,
  });

  this.Router = new Router();
  Parse.history.start();
  handlers.navbar();

})();
