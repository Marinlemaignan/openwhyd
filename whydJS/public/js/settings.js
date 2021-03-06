$(function() {

	$("#tabSelector a").click(function() {
		$("#tabSelector a.selected").removeClass("selected");
		$(this).addClass("selected");
		$(".tabContent").hide();
		$(".tabContent#" + $(this).attr("href").split("#").pop()).show();
	});

	function backtonormal() {
		$(".fld").removeClass("error").removeClass("ok");
		$(".msg").hide();
	};

	function submitChange(data, cb) {
		console.log("submitting", data);
		$.ajax({
			type: "POST",
			url: "/api/user",
			data: data,
			success: cb,
			error: function(e) {
				cb && cb({error: e});
			}
		});
	}

	function submitFieldChange(data, $field, cb) {
		var $btn = $field.closest("form").find("input[type=submit]").addClass("loading");
		submitChange(data, function(res) {
			$btn.removeClass("loading");
			var res = res || {};
			console.log("res", res);
			if (res.error)
				$field.find(".msg").first().text(res.error && typeof res.error == "string"
					? res.error : "An unknown error occured, please try again").show();
			cb && cb(res);
		});
	}

	// == "account" tab ==

	var $handle = $("input[name=handle]");
	var $email = $("input[name=email]");

	$("input[data-checked=true]").each(function() {
		$(this).attr("checked", "checked");
	});

	function onDeleteConfirm() {
		$.post("/api/user", {action:"delete"}, function(response){
			console.log('response', response);
			avgrundClose();
			showMessage(response);
		});
	}

	$("#deleteAccount").click(function(e){
		e.preventDefault();
		var $html = $('<div>'
		  + '<img src="/images/fun-y_u_no_use_whyd.jpg" style="float:left;margin:15px;">'
		  + '<span style="line-height:30px;">Are you sure?</span><br>'
		  + '<span style="font-weight:normal;">If you have a question or problem,<br>we\'re happy to help at contact@openwhyd.org.</span>'
		  + '</div><span class="redButton">Delete my account</span>');
		$html.last().click(function(){
			$html.find("span").eq(1).css("color", "red").text("Your profile and playlists will be deleted permanently!");
			$html.last().text("Delete my data now!").unbind("click").click(onDeleteConfirm);
		});
		openJqueryDialog($html, "dlgDeletePost", "Delete your openwhyd account");
	});

	function validateUsername() {
		$handle.parent().find(".msg").hide();
		var val = $handle.val();
		val = val.toLowerCase();
		try { val = val.trim(); } catch(e) {};
		$handle.val(val)
		if (val == "") return 0;
		var valid = /^[a-z0-9]+[a-z0-9_\-\.]+[a-z0-9]+$/i.test(val);
		if (valid)
			$("#url > span").text(val);
		return valid ? 1 : -1;
	}

	validateUsername();

	$handle.bind("keydown keypress change", function() {
		setTimeout(function() {
			var valid = validateUsername();
			$handle.parent()
				.toggleClass("ok", false) //valid == 1)
				.toggleClass("error", false); //valid == -1);
		}, 50);
	});

	function submitHandle(cb) {
		var handle = $handle.val();
		if (handle)
			submitFieldChange({handle: handle}, $handle.parent(), function(res) {
				var ok = handle == res.handle;
				$handle.parent().toggleClass(ok ? "ok" : "error");
				if (res.handle)
					$handle.val(res.handle);
				cb && cb(ok);
			});
		else
			cb && cb();
	}

	function submitEmail(cb) {
		var email = $email.val();
		submitFieldChange({email: email}, $email.parent(), function(res) {
			var ok = email == res.email;
			$email.parent().toggleClass(ok ? "ok" : "error");
			if (res.email)
				$email.val(res.email);
			cb && cb(ok);
		});
	}

	function submitPref(cb) {
		var pref = {};
		var $pref = $("#pref");
		$pref.find("input").each(function() {
			pref[$(this).attr("name")] = $(this).attr("checked") ? 1 : 0;
		});
		console.log("pref", pref);
		submitFieldChange({pref: pref}, $pref, function(res) {
			var ok = res && res.pref;
			$pref.toggleClass(ok ? "ok" : "error");
			if (res && res.pref && window.user)
				window.user.pref = res.pref;
			cb && cb(ok);
		});
	}

	$("#tabAccount form").submit(function(event) {
		event.preventDefault();
		backtonormal();
		validateUsername();
		var accountSteps = [submitHandle, submitEmail, submitPref];
		var allOk = true;
		(function next(ok) {
			allOk = allOk && ok;
			var step = accountSteps.shift();
			if (step)
				step(next);
			else
				showMessage(allOk ? "Your changes were successfully applied" : "Please fix your settings and try again", !allOk);
		})(true);
	});

	var $fbConn = $("#fbConn").addClass("loading");
	whenFbReady(function() {
		function toggleFbPrefs(connected) {
			$fbConn.toggle(!connected).removeClass("loading").unbind().click(fbConnect);
			$("#pref").toggle(connected);
		}
		function fbConnect() {
			$fbConn.addClass("loading").unbind().click(function(e){
				e.preventDefault();
				showMessage("Still loading, please wait...");
			});
			fbAuth("", toggleFbPrefs);
		}
		fbIsLogged(toggleFbPrefs);
	});

	// lastfm
	(function() {
		var $lastFmConn = $("#lastFmConn");
		var $lastFmPref = $("#lastFmPref");
		var href = window.location.href;
		href = href.substr(0, href.indexOf("/", 10)) + "/api/lastFm";
		href = $lastFmConn.attr("href") + "&cb=" + encodeURIComponent(href);
		$lastFmConn.attr("href", href);
		$("#lastFmDcon").attr("href", href);

		function toggleLastFmConnection(connected) {
			$lastFmConn.toggle(!connected).removeClass("loading").unbind().click(lastFmConn);
			$lastFmPref.toggle(!!connected);
			if (connected && window.user.lastFm)
				$("#lastFmProfile").text(window.user.lastFm.name).attr("href", "http://lastfm.com/user/" + window.user.lastFm.name);
		}

		function lastFmConn(e) {
			e.preventDefault();
			$lastFmConn.addClass("loading").unbind().click(function(e){
				e.preventDefault();
				showMessage("Still loading, please wait...");
			});
			var popup = window.open(href, "whyd_lastFmConn", "height=600,width=800,location=no,menubar=no,resizable=no,scrollbars=no,toolbar=no");
			popup.focus();
			window.lastFmCallback = function(session) {
				console.log(session, typeof session)
				if (session && session.sk && session.name) {
					window.user.lastFm = session;
					toggleLastFmConnection(true);
				}
				else {
					delete window.user.lastFm;
					toggleLastFmConnection(false);
				}
				popup.close();
			}
		}

		$lastFmConn.click(lastFmConn);

		toggleLastFmConnection(window.user.lastFm && window.user.lastFm.name && window.user.lastFm.sk);
	})();

	// DEEZER CONNECTION
	(function(){
		$deezerConBtn = $("#deezerProfile");

		var SDK_URL = 'https://cdns-files.deezer.com/js/min/dz.js',
        IS_LOGGED = false,
				IS_READY = false

		// setup DOM unless existing
		var dz;
		if (!document.getElementById('dz-root')) {
			dz = document.createElement('div');
			dz.id = 'dz-root';
			document.getElementsByTagName("body")[0].appendChild(dz);
		}

		// load DZ SDK INTO SCOPE
		loader.includeJS(SDK_URL, function(){
			IS_READY = true;
		});

		// initialize the oAuth client and triggers user's login popup
		function initAuth() {
			if ( !IS_READY )
				return

			DZ.init({
				appId: DEEZER_APP_ID,
				channelUrl: DEEZER_CHANNEL_URL
			});

			DZ.getLoginStatus(function(response) {
				if (response.authResponse) {
					IS_LOGGED = true;
				}
			});

			if ( !IS_LOGGED ) {
				DZ.login(function(response) {
					if (response.userID) {
						IS_LOGGED = true;
						console.log('Login successful. Your Deezer tracks will be full length from now on!');
					} else {
						console.log('Deezer login unsuccesful.', true);
					}
				}, {perms: 'email'});
			}
		};

		$deezerConBtn.click(function(event){
			event.preventDefault();
			initAuth();
		});


	})();

	// == "password" tab ==

	//var pwdRegex = /^[a-zA-Z0-9!@#$%^&*]{4,32}$/; // http://stackoverflow.com/questions/5822413/password-validation-javascript
	var $old = $("input[name=old]");
	var $new1 = $("input[name=new1]");
	var $new2 = $("input[name=new2]");

	var $pwdForm = $("#tabPassword form").submit(function(e) {
		e.preventDefault();
		backtonormal();
		if (/*!pwdRegex.test($old.val())*/ $old.val().length < 4 || $old.val().length > 32)
			$old.parent().addClass("error")
				.find(".msg").text("Please enter your current password").show();
		else if ($new1.val().length < 4 || $new1.val().length > 32)
			$new1.parent().addClass("error")
				.find(".msg").text("Your new password must be between 4 and 32 characters").show();
		/*else if (!pwdRegex.test($new1.val()))
			$new1.parent().addClass("error")
				.find(".msg").text("Your new password contains invalid characters").show();*/
		else if ($new1.val() != $new2.val())
			$(".pwdRepeat").addClass("error")
				.find(".msg").first().text("You must enter the same new password twice").show();
		else {
			submitFieldChange({pwd:$new1.val(), oldPwd:$old.val()}, $pwdForm, function(res) {
				$pwdForm.find(".fld").toggleClass(!res.error ? "ok" : "error");
				showMessage(res.error || "Your password was successfully set", !!res.error);
			});
			/*
			$(this).closest("input[type=submit]").addClass("loading");
			$.ajax({
				type: "GET",
				url: "/api/user",
				data: {pwd:$new1.val(), oldPwd:$old.val()},
				complete: function(data) {
					console.log(data);
					if ("" + data.responseText != "null") {
						var p = $tabPwd.find("p");
						var backup = $tabPwd.css("background");
						$p.css("background", "#a9da92").text("Your password is up to date :-)").show();
						setTimeout(function() {
							$.modal.close();
							$tabPwd.find(".btnSave").removeClass("loading");
							$p.css("background", backup);
						}, 2000);
					}
					else {
						$btnSave.removeClass("loading");
						$old.addClass("inputError");
						$p.text("Unable to update. Check your current password.").show();
					}
				}
			});
			*/
		}
		return false;
	});

	// == "notifications" tab ==

	$("#tabNotif input[data-checked]").each(function() {
		var freq = $(this).attr("data-checked");
		if (freq != "-1") {
			$(this).attr("checked", "checked");
			$("input[name=emFreq][value="+freq+"]").attr("checked", "checked");
		}
	});
	/*
	$("div[data-value]").each(function() {
		var $prefDiv = $(this);
		var val = $prefDiv.attr("data-value");
		$(this).find("input[value="+val+"]").attr("checked", "checked");
	});
	*/
	$("#tabNotif form").submit(function(event) {
		event.preventDefault();
		backtonormal();
		var pref = {};
		var $pref = $("#tabNotif");
		/*
		$pref.find("input:radio:checked").each(function() {
			pref[this.name] = this.value;
		});
		*/
		var freq = $pref.find("input:radio:checked").val();

		$pref.find("input").each(function() {
			pref[$(this).attr("name")] = $(this).attr("checked") ? freq : -1;
		});
		console.log("pref", pref);

		submitFieldChange({pref: pref}, $pref, function(res) {
			var ok = res && res.pref;
			$pref.toggleClass(ok ? "ok" : "error");
			if (ok && window.user)
				window.user.pref = res.pref;
			showMessage(ok ? "Your changes were successfully applied" : "Oops, something went wrong! Please try again", !ok);
		});
	});

	// == "goodies" tab ==

	var $goodiesCode = $("#tabGoodies textarea");
	var $goodiesSteps = $("#tabGoodies > div.disabled");
	var $goodiesBtns = $("#tabGoodies .content > div");
	$goodiesBtns.each(function(i, btn){
		var $btn = $(btn);
		var width = $btn.attr("data-width");
		var src = "//openwhyd.org/btn/profile?uId=" + window.user.id + (width ? "&width=" + width : "");
		var html = '<iframe src="'+encodeURI(src)+'" width="'+(width||"180")+'" height="'+(width||"20")+'"'
			+ ' frameborder="0" allowtransparency="true" scrolling="no"></iframe>';
		$btn.click(function() {
			$goodiesCode.val(html);
			$goodiesSteps.removeClass("disabled");
			$goodiesBtns.removeClass("selected");
			$btn.addClass("selected");
		});
	});
});
