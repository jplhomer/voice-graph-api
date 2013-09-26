/*global define */
define(['jquery', 'facebook'], function ( $ ) {
	'use strict';

    var final_transcript = '';
    var recognizing = false;
    var ignore_onend;
    var start_timestamp;
    if (!('webkitSpeechRecognition' in window)) {
        upgrade();
    } else {
        start_button.style.display = 'inline-block';
        var recognition = new webkitSpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onstart = function() {
            recognizing = true;
            showInfo('info_speak_now');
            start_img.src = 'http://google.com/intl/en/chrome/assets/common/images/content/mic-animate.gif';
        };

        recognition.onerror = function(event) {
            if (event.error == 'no-speech') {
                start_img.src = 'http://google.com/intl/en/chrome/assets/common/images/content/mic.gif';
                showInfo('info_no_speech');
                ignore_onend = true;
            }
            if (event.error == 'audio-capture') {
                start_img.src = 'http://google.com/intl/en/chrome/assets/common/images/content/mic.gif';
                showInfo('info_no_microphone');
                ignore_onend = true;
            }
            if (event.error == 'not-allowed') {
                if (event.timeStamp - start_timestamp < 100) {
                    showInfo('info_blocked');
                } else {
                    showInfo('info_denied');
                }
                ignore_onend = true;
            }
        };

        recognition.onend = function() {
            recognizing = false;
            if (ignore_onend) {
                return;
            }
            start_img.src = 'http://google.com/intl/en/chrome/assets/common/images/content/mic.gif';
            if (!final_transcript) {
                showInfo('info_start');
                return;
            }
            showInfo('');
            if (window.getSelection) {
                window.getSelection().removeAllRanges();
                var range = document.createRange();
                range.selectNode(document.getElementById('final_span'));
                window.getSelection().addRange(range);
            }
        };

        recognition.onresult = function(event) {
            var interim_transcript = '';
            if (typeof(event.results) == 'undefined') {
                recognition.onend = null;
                recognition.stop();
                upgrade();
                return;
            }
            for (var i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    final_transcript += event.results[i][0].transcript;
                } else {
                    interim_transcript += event.results[i][0].transcript;
                }
            }
            final_transcript = capitalize(final_transcript);
            final_span.innerHTML = linebreak(final_transcript);
            interim_span.innerHTML = linebreak(interim_transcript);
            if (final_transcript || interim_transcript) {
                showButtons('inline-block');

                var question = final_transcript;
                console.log(question);

                process_question(question);
            }
        };
    }

    function upgrade() {
        start_button.style.visibility = 'hidden';
        showInfo('info_upgrade');
    }

    var two_line = /\n\n/g;
    var one_line = /\n/g;
    function linebreak(s) {
        return s.replace(two_line, '<p></p>').replace(one_line, '<br>');
    }

    var first_char = /\S/;
    function capitalize(s) {
        return s.replace(first_char, function(m) { return m.toUpperCase(); });
    }

    function startButton(event) {
        if (recognizing) {
            recognition.stop();
            return;
        }
        final_transcript = '';
        recognition.lang = 'en-US';
        recognition.start();
        ignore_onend = false;
        final_span.innerHTML = '';
        interim_span.innerHTML = '';
        start_img.src = 'http://google.com/intl/en/chrome/assets/common/images/content/mic-slash.gif';
        showInfo('info_allow');
        showButtons('none');
        start_timestamp = event.timeStamp;
    }

    function showInfo(s) {
        if (s) {
            for (var child = info.firstChild; child; child = child.nextSibling) {
                if (child.style) {
                    child.style.display = child.id == s ? 'inline' : 'none';
                }
            }
            info.style.visibility = 'visible';
        } else {
            info.style.visibility = 'hidden';
        }
    }

    var current_style;
    function showButtons(style) {

    }

    console.log('Running jQuery %s', $().jquery);

    $(function() {
    	$('#start_button').click(function(e) {
    		startButton(e);
    	});

        $('.reset').click(function() {
            final_transcript = '';
            $('#final_span').html('');
        });

        $('#name_query').blur(function() {
            var query = $(this).val();

            if (query.split(' ').length > 1) {
                find_friend_by_full_name(query);
            } else {
                find_friend_by_first_name(query);
            }
        })
    })

    var friends_list = {};

    function get_friends_list() {
        FB.api('/me/friends?fields=name,id,gender', function(response) {
            friends_list = response.data;
            console.log(friends_list);
        });
    }

    function find_friend_by_first_name( query ) {
        var friend = $.grep(friends_list, function(e) { return e.name.toLowerCase().split(' ').indexOf(query.toLowerCase()) != -1; });

        if (friend.length > 0) {
            console.log(friend[0]);
            get_friend_info(friend[0], 'high_school');
        } else {
            console.log('Sorry. No friends found by that name.');
            $('#education_results').html('');
        }        
    }

    function find_friend_by_full_name( query ) {
        var friend = $.grep(friends_list, function(e) { return e.name.toLowerCase().indexOf(query.toLowerCase()) != -1; });

        if (friend.length > 0) {
            console.log(friend[0]);
            get_friend_info(friend[0], 'high_school');
        } else {
            console.log('Sorry. No friends found by that name.');
            $('#education_results').html('');
        }        
    }

    function get_friend_info( friend, info_type ) {
        var field = '',
            desired_info = '';

        var pp = get_user_possessive_pronoun( friend );

        switch (info_type) {
            case 'high_school':
                field = 'education';
                desired_info = 'High School';
            break;
        }

        FB.api('/me/friends/?uid=' + friend.id + '&fields=' + field, function(response) {
            var answer = '';

            if (response.data[0].education) {
                answer = response.data[0].education[0].school.name;
                console.log(answer);
                update_education_results( friend.name, pp, answer, true );
            } else {
                console.log(response.data[0]);
                update_education_results( friend.name, pp, '', false );
            }            
        });
    }

    function update_education_results( name, pp, school, success ) {
        if ( success ) {
            $('#education_results').html(name + ' went to ' + school);
        } else {
            $('#education_results').html(name + ' doesn\'t share ' + pp + ' education information :(');
        }
    }

    /**
     * We're just gonna do something stupid simple: 
     * grab the name from the query and get the person's HS.
     * @param  {string} question Question asked by the user
     * @return {string}          Name of the person
     */
    function process_question( question ) {
        var query = '';
        question = question.trim().toLowerCase();
        console.log(question);
        if (question.indexOf('where did') == -1)
            return false;

        // Break out 'where did' and 'go to high school'
        query = question.replace('where did ', '').replace(' go to high school', '');

        console.log(query);

        if (query.split(' ').length > 1) {
            find_friend_by_full_name(query);
        } else {
            find_friend_by_first_name(query);
        }
    }

    FB.init({
        appId      : '378212078975297',
        channelUrl : '//localhost:9000/channel.html',
        status     : true, // check login status
        cookie     : true, // enable cookies to allow the server to access the session
        xfbml      : true  // parse XFBML
    });

    function get_user_possessive_pronoun( user ) {
        if (user.gender) {
            if (user.gender == 'male') {
                return 'his';
            } else {
                return 'her';
            }
        } else {
            return 'their'
        }
    }
      
    FB.Event.subscribe('auth.authResponseChange', function(response) {
    
        if (response.status === 'connected') {
            testAPI();
            get_friends_list();
        } else if (response.status === 'not_authorized') {
            console.log('Welp, you can\'t use this app.');
        } else {
            // In this case, the person is not logged into Facebook, so we call the login() 
            // function to prompt them to do so. Note that at this stage there is no indication
            // of whether they are logged into the app. If they aren't then they'll see the Login
            // dialog right after they log in to Facebook. 
            // The same caveats as above apply to the FB.login() call here.
            FB.login();
        }
    });

    // Here we run a very simple test of the Graph API after login is successful. 
    // This testAPI() function is only called in those cases. 
    function testAPI() {
        console.log('Welcome!  Fetching your information.... ');
        FB.api('/me', function(response) {
            console.log('Good to see you, ' + response.name + '.');
        });
    }

    });