/*! I wrapped this in a jquery plugin
-*    this function essentially extracts the important information from the html element and
-*    creates a new exchange with the JS object
-**/

(function($){
	var wrap, SmsExchange,
		Messages,
		maxId = 0,
		exchangeVersion = "0.1";
	
	$.fn.enableSmsExchangeIn = function(_wrap){
		SmsExchange.placeIn(_wrap);
		wrap = $(_wrap);
		this.each(function(){
			wrap.append(SmsExchange.fromHTML(this));
			$(this).hide();
		})
	}
	SmsExchange = (function(){
	   /*!  The "exchange" object is what stores the details of a conversation in the DOM and inserts them into 
	   -*   See "importHTML" to edit the import function.  
	   -*   You can also use json
	   -*/
		var exchangeWrap,
			unfocusMessageTable,
			charLimit = 160;

		function setWrapElement(elm) {
			var table = ($(elm).get(0).nodeName.toLowerCase()=="table") ?
				$(elm) : $("<table />"),
				twrap = $("<tbody />");

			table.addClass('msgs').html(
				"<col class='status'>" +
				"<col class='name'>" +
				"<col class='subj'>" +
				"<col class='date'>" +
				"<col class='l'>");

			table.append(twrap);
			exchangeWrap = twrap;
		}
		
		function exchange(opts, placement) {
			if(!exchangeWrap) {throw("Wrap element must be defined");}
			this.id			=	opts.id.match(/\d+/)[0];
			if(parseInt(this.id)>maxId) {maxId=this.id}
			this.status		=	opts.status;
			this.details	=	opts.details;
			this.message	=	opts.message;
			this.responses	=	opts.responses instanceof Array ? opts.responses : [];
			this.name		=	opts.name;
			this.dateStr	=	opts.dateStr;
			this.respMessage=	"";
			if(placement=="prepend") {
//				exchangeWrap.find('tr').get(-1).smsExchange.remove();
				this.createTr();
				this.tr.css({'display':'none'});
				exchangeWrap.prepend(this.tr);
				this.tr.fadeIn();
			} else {
				exchangeWrap.append(this.createTr());
			}
		}

		//UI specific messages
		exchange.prototype.msgs = function(){
			return Translations[CurrentLang];
		}
		exchange.prototype.responsesSummary = function() { var rc = this.responses.length; return (rc==1) ? ("1 "+this.msgs().response) : (rc + " " + this.msgs().responses) }
		exchange.prototype.statusSummary = function() { return this.msgs().status[this.statusCode()] }
		exchange.prototype.statusCode = function() {return this._status || 'pending';}
		exchange.prototype.dateString = function() {return this.dateStr}

		exchange.prototype.setStatus = function(str){
			if(typeof(this.responseRow)!=="undefined") {
				$(this.responseRow).find('div.status').get(0).className="status "+str;
				$(this.responseRow).find('div.status').get(0).title = this.msgs().status[str];
			}
			$(this.tr).find('div.status').get(0).className="status "+str;
			$(this.tr).find('div.status').get(0).title = this.msgs().status[str];
		}
		exchange.prototype.remove = function(){this.tr.fadeOut();}
		exchange.prototype.submitMessage = function(obj){
			var _exch = this;
			$.post('sample_json/sms_received.json', obj, function(data){
				_exch.setStatus(data['status'])
			})
		}
		exchange.prototype.updateResponses = function() {
			$(this.tr).find('.replycount').text(this.responsesSummary())
			if(typeof(this.responseRow)!=='undefined'){$(this.responseRow).find('.replycount').text(this.responsesSummary())}
		}
		exchange.prototype.createTr = function() {
			var _r = this;
			this.tr = $("<tr></tr>");
			this.tr.buildIn(
					["td", {}, ["div",{'class':'status'}]],
					["td", {}, this.name],
					["td", {}, this.message],
					["td", {}, this.dateString()],
					["td", {}, ["span", {'class':'replycount'},
							this.responsesSummary()
						]]
					);

			if(this.status!==null) {this.setStatus(this.status)}
			this.tr.click(function(){_r.clickOpen.call(_r)});
			this.tr[0].smsExchange=this;
			return this.tr;
		}
		unfocusMessageTable = function(obj, callback) {
			$('table.msgs .expanded-msg .slidedown').slideUp(100, function(){
				$('table.msgs .expanded-msg').hide();
				$('table.msgs .hidden-open').removeClass('hidden-open');
				$('table.msgs .expanded-msg').remove();
				if(typeof(callback)=='function') {callback.call(obj)}
			});
		}
	
        /*!  The populateTrAndOpen function loads the expanded message and adds listeners, etc.
        -*
	    -*/
		exchange.prototype.populateTrAndOpen = function() {
			var b_form, b_wdiv, b_rrow,
				_r = this,
				boldRow, textArea, ul;
			
			b_form = ["form", {}, 
				["div", {}, 
					["input", {'type':'hidden','name':'sms_id','value':this.id}]
				],
				["table", {},["tbody", {},["tr", {},
							["td", {'rowspan':2}, ["textarea", {'name':'message', 'cols':60, 'rows':2}, this.respMessage]],
							["td", {}, ["a",{'class':'send','href':'#'}, this.msgs().sendMessage]]
				],
				["tr", {}, 
							["td", {}, ["span", {'class':'chars'}]]
					]]
				]
			];
			b_wdiv = ["div", {'class':'w'}, 
				["table", {'class':'original'}],
				["div", {'class':'slidedown'},
					["ul", {'class':'response_list'}],
					["div", {'class':'response_box'}, b_form]
				]
			];
			b_rrow = ["tr", {'class':'expanded-msg'}, ["td", {'colspan':6, 'class':'featured_message'}, b_wdiv]];
			
			this.tr.find('td').each(function(){$(this).css({'width': $(this).width()})})

			this.responseRow = $.json2dom(b_rrow);
			ul = this.responseRow.find('ul.response_list');
			$(this.responses).each(function(){ul.append("<li>"+this+"</li>")});

			boldRow = this.tr.clone().addClass('bold');
			boldRow.find('td').css({'border':'1px solid #efefef', 'border-width':'0 0 1px 0'})
			boldRow.click(function(){unfocusMessageTable()})
			
			this.responseRow.find('table.original').append(boldRow);
			this.responseRow.find('.slidedown').hide();

			//counter updater
			textArea = this.responseRow.find('textarea');
			if(textArea.val().trim()=="") { //need to disable button if textarea empty
				textArea.parent('table').find('a.send').addClass('disabled').attr('title', 'Empty')
			}

			textArea.keyup(function(evt){
				var remaining, chars, submitButton;
				remaining = charLimit - smsCharCount($(this).val());
				chars = $(this).closest('table').find('.chars');
				submitButton = $(this).closest('table').find('a.send')
				chars.text(remaining);
				if(remaining < 0) {
					chars.addClass('negative');
					submitButton.addClass('disabled');
					submitButton.attr('title', _r.msgs()['tooManyCharacters'])
				} else {
					if(chars.hasClass('negative')){
						chars.removeClass('negative');
						submitButton.removeClass('disabled');
						submitButton.attr('title', '')
					}
				}
			});
		
			//stores textareas value in the dom temporarily
			textArea.blur(function(){
				_r.respMessage = $(this).val();
			});
		
			//submits form on "return"
			textArea.keydown(function(evt){
				if(evt.keyCode==13) { $(this).closest('form').submit(); return false; }
			});

			//submit action for the form
			this.responseRow.find('form').submit(function(evt){
				var postMsg,
					p = $(this).parent();
				if(p.find('a.send').hasClass('disabled')) {
					alert(p.find('a.send').attr('title'))
					return false;
				}
				if(p.find('textarea').val().trim()=="") {
					return false;
				}
				postMsg = {
					id: _r.id,
					msg: $(this).find('textarea').val(),
					token: ExchangeSettings.token
				};
				_r.respMessage = "";
				_r.responses.push(postMsg.msg);
				$.post(ExchangeSettings.msgPOSTurl, postMsg, function(data){
					$($(_r.responseRow.find('li.pending')).get(-1)).text(data.sms);
					_r.setStatus(data.status)
				});
				_r.setStatus('pending');
				_li = $("<li>" + postMsg.msg + "</li>");
				_li.css({'display':'none'})
				p.parent().find('ul').append(_li);
				$(this).fadeOut(200, function(){
					_li.slideDown(100, function(){$(this).attr('style','')});
					p.slideUp(200);
				})
				_r.updateResponses();
				evt.preventDefault();
			});

			this.responseRow.find('a.send').click(function(evt){
				$(this).closest('form').submit();
				$(this).blur();
				evt.preventDefault();
			});

			this.tr.after(this.responseRow);
			this.tr.addClass('hidden-open');
			this.responseRow.find('div.slidedown').slideDown(100, function(){
				$(this).find('input[type=text]').focus()
			});
		}
		exchange.prototype.clickOpen = function() {
			var focused = ($('table.msgs').find('.hidden-open').length > 0);
			if(focused) {
				unfocusMessageTable(this, this.populateTrAndOpen)
			} else {
				this.populateTrAndOpen();
			}
		}
		function smsCharCount(str) {
			var tempStr = String(str),
				count = 0,
				i = 0,
				unicodeCharCount = "\\u1234".length,
				letter;
			for(i;i<str.length;i++) {
				count += str[i].charCodeAt(0)<122 ? 1 : unicodeCharCount
			}
			return count;
		}

		/*! importHTML will have to be updated whenever html input changes
		-*    this function essentially extracts the important information from the html element and
		-*    creates a new exchange with the JS object
		-**/
		function importHTML(elem){
			var elems = {
				details: $(elem).find('.details').get(0),
				originalMessage: $(elem).find('.msg.text').get(0),
				responses: $(elem).find('.msg.response')
			}
			return new exchange({
				status: $(elems.details).find('.status').attr('title'),
				details: $.map($.trim($(elems.details).text()).split("\n"), $.trim).join("\n"), //traverses each line and trims whitespace
				message: $.trim($(elems.originalMessage).text()),
				responses: $.map($(elems.responses), function(e){return $(e).text()}),
				id: $(elem).find('input.resp_box').attr('name'),
				dateStr: $(elems.details).find('.date').text(),
				name: $(elem).find('.details').text().trim().split("\n")[1].trim().split(" ")[1] //it would be much nicer if we could get a "name" field...
			});
		}
		function importJSON(json) {return new exchange(json)}
		return {
			fromHTML: importHTML,
			fromJSON: importJSON,
			placeIn: setWrapElement,
			constructor: exchange
		}
	})();
	var reqUrl, freq = 4 * (1000 * 60);
	$.listenForMessages = function(url, frequency) {
		reqUrl = url;
		freq = (frequency < 1000) ? (frequency*1000) : frequency;
		window.setTimeout(checkForMessages, freq);
	}
	function checkForMessages() {
		$.getJSON(reqUrl, "id="+maxId, function(results){
			$(results).each(function(){
				var nm = new SmsExchange.constructor(this, "prepend");
			});
		});
		window.setTimeout(checkForMessages, freq);
	}
})(jQuery)
