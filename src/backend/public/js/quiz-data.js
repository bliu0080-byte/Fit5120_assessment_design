const quizData = {
    phone: {
        title: "Phone Scam Awareness",
        questions: [
            {
                scenario: "You receive a call from someone claiming to be from the ATO (Australian Tax Office). They say you owe $3,000 in unpaid tax and must pay immediately via iTunes gift cards, or you will be arrested.",
                question: "Is this a scam?",
                options: [
                    "Yes, this is definitely a scam",
                    "No, the ATO does collect taxes this way",
                    "Maybe, I should pay to be safe",
                    "I need more information to decide"
                ],
                correctAnswer: 0,
                explanation: "✅ Yes, this is a scam. The ATO will never demand tax payments in gift cards, cryptocurrency, or other unusual methods. This is a well-known scam tactic where fraudsters create panic by threatening arrest or legal action, pushing you to act quickly without thinking."
            },
            {
                scenario: "An unknown caller says they are from Telstra. They insist your internet has been hacked and ask you to download remote access software so they can 'fix' the problem.",
                question: "Scam or genuine?",
                options: [
                    "Genuine - Telstra does provide tech support",
                    "Scam - this is a remote access scam",
                    "Could be either, depends on the software",
                    "I should test it first"
                ],
                correctAnswer: 1,
                explanation: "✅ This is a remote access scam. Telstra and other service providers will not cold-call you and demand that you install programs such as AnyDesk or TeamViewer."
            },
            {
                scenario: "You get a call with your bank's number showing on caller ID. The caller claims there has been suspicious activity on your account and asks you to confirm your full PIN and password.",
                question: "What should you do?",
                options: [
                    "Provide the information to secure my account",
                    "Ask them to prove they're from the bank first",
                    "Hang up - this is a spoofing scam",
                    "Give partial information only"
                ],
                correctAnswer: 2,
                explanation: "✅ This is a spoofing scam. Caller ID can be faked easily. Banks will never ask you for your full PIN or password over the phone."
            },
            {
                scenario: "A caller says you've won a holiday package but need to pay a $500 'release fee' immediately by phone to claim it.",
                question: "Is this legitimate?",
                options: [
                    "Yes, processing fees are normal for prizes",
                    "No, this is a lottery/prize scam",
                    "Maybe, if they can provide documentation",
                    "I should negotiate a lower fee"
                ],
                correctAnswer: 1,
                explanation: "✅ This is a lottery or prize scam. A legitimate prize win never requires you to pay money upfront."
            },
            {
                scenario: "Someone calls claiming to be from Centrelink. They say your pension payments are frozen unless you confirm your Medicare number and bank details.",
                question: "What's the best response?",
                options: [
                    "Provide the details to unfreeze payments",
                    "Ask for their employee ID first",
                    "Hang up and call Centrelink directly",
                    "Only give Medicare number, not bank details"
                ],
                correctAnswer: 2,
                explanation: "✅ This is an identity theft scam. Centrelink will not call out of the blue demanding your bank or Medicare details."
            },
            {
                scenario: "You receive a call from a man claiming to be your grandson. He says he's been in a car accident and urgently needs you to transfer $4,000 for bail money.",
                question: "What should you do?",
                options: [
                    "Transfer the money immediately to help",
                    "Ask personal questions only your grandson would know",
                    "Hang up and call your grandson directly",
                    "Offer to pay the police station directly"
                ],
                correctAnswer: 2,
                explanation: "✅ This is the 'Hi Mum/family emergency' scam. Real police or courts never arrange bail payments by phone."
            },
            {
                scenario: "You get a call saying your Amazon Prime subscription will auto-renew for $799 unless you press '1' to cancel.",
                question: "Is this genuine?",
                options: [
                    "Yes, Amazon uses automated systems",
                    "No, this is a subscription renewal scam",
                    "Maybe, I should check my Amazon account",
                    "I should provide details to stop the charge"
                ],
                correctAnswer: 1,
                explanation: "✅ This is a subscription renewal scam. Amazon never calls customers to collect payment details."
            },
            {
                scenario: "A caller from your electricity provider says your power will be cut off in 30 minutes unless you pay by Bitcoin.",
                question: "What indicates this is a scam?",
                options: [
                    "The 30-minute deadline",
                    "Requesting Bitcoin payment",
                    "Both the deadline and Bitcoin request",
                    "Nothing - this sounds legitimate"
                ],
                correctAnswer: 2,
                explanation: "✅ This is a utility bill scam. Legitimate providers never demand cryptocurrency payments."
            },
            {
                scenario: "You get a call from your doctor's clinic reminding you of an appointment tomorrow.",
                question: "Is this a scam?",
                options: [
                    "Yes, all unexpected calls are scams",
                    "No, this is a legitimate service call",
                    "Maybe, I should be suspicious",
                    "I need more information"
                ],
                correctAnswer: 1,
                explanation: "❌ Not a scam. Medical clinics often ring to confirm appointments."
            },
            {
                scenario: "Your bank calls after you reported a lost card. They ask to confirm your address but don't ask for PIN.",
                question: "Is this legitimate?",
                options: [
                    "No, banks never call customers",
                    "Yes, this is a normal follow-up",
                    "Suspicious - they shouldn't need my address",
                    "I should hang up immediately"
                ],
                correctAnswer: 1,
                explanation: "❌ Not a scam. This is normal follow-up after you initiated contact."
            }
        ]
    },
    web: {
        title: "Web Phishing Detection",
        questions: [
            {
                scenario: "You receive an email with a link: http://secure-bank-login.au-check.com",
                question: "What should you do?",
                options: [
                    "Click the link and enter your details",
                    "Ignore the email and delete it",
                    "Call your bank using their official number",
                    "Reply to the email asking if it's genuine"
                ],
                correctAnswer: 2,
                explanation: "Never click suspicious links. Contact your bank directly through official channels."
            },
            {
                scenario: "Text: 'Australia Post: Pay $2.99 for redelivery. Link: auspost-verify.net'",
                question: "What's the best action?",
                options: [
                    "Click the link and pay the fee",
                    "Call Australia Post using their official number",
                    "Reply to the text asking for details",
                    "Open the link only on your phone"
                ],
                correctAnswer: 1,
                explanation: "✅ Scammers send fake delivery texts to steal card details. Verify through official channels."
            },
            {
                scenario: "Email from 'ATO Refund Team' at ato-refund@securemail.co",
                question: "What's the safest response?",
                options: [
                    "Log in immediately to claim refund",
                    "Delete the email and ignore it",
                    "Forward it to friends",
                    "Reply asking for confirmation"
                ],
                correctAnswer: 1,
                explanation: "✅ The ATO handles refunds through MyGov, not email. Delete immediately."
            },
            {
                scenario: "Facebook ad: '50% OFF Ray-Bans at rayban-au-discount.shop'",
                question: "What should you do?",
                options: [
                    "Buy quickly before offer ends",
                    "Search for the official Ray-Ban website",
                    "Trust it because it's on Facebook",
                    "Check if PayPal is available"
                ],
                correctAnswer: 1,
                explanation: "Fake shopping sites use '.shop' domains. Find the official site yourself."
            },
            {
                scenario: "Call: 'This is Microsoft. Your computer has a virus.'",
                question: "What's the appropriate response?",
                options: [
                    "Hang up immediately",
                    "Ask for their employee ID",
                    "Follow instructions",
                    "Pay for security software"
                ],
                correctAnswer: 0,
                explanation: "Microsoft never cold-calls. This is a tech support scam."
            },
            {
                scenario: "Email: 'You won a Coles $500 gift card. Click to claim.'",
                question: "What should you do?",
                options: [
                    "Click the link",
                    "Delete the email immediately",
                    "Forward to Coles",
                    "Reply with details"
                ],
                correctAnswer: 1,
                explanation: "✅ If you didn't enter a competition, you can't win. Delete immediately."
            },
            {
                scenario: "SMS from 'NAB': 'Account locked. Login: nab-support-login.com'",
                question: "What's the safest action?",
                options: [
                    "Log in via the link",
                    "Call NAB using number on your card",
                    "Reply to the SMS",
                    "Wait for another message"
                ],
                correctAnswer: 1,
                explanation: "Never trust links in messages. Call using the number on your card."
            },
            {
                scenario: "Email: 'Provide your TFN and bank details for job application.'",
                question: "What should you do?",
                options: [
                    "Reply with details",
                    "Report as a scam",
                    "Click the link",
                    "Share with friends"
                ],
                correctAnswer: 1,
                explanation: "Legitimate employers never ask for TFN upfront via email."
            },
            {
                scenario: "Message: 'Facebook disabled. Verify at facebook-login-safe.net'",
                question: "What's the best response?",
                options: [
                    "Log in quickly",
                    "Go directly to facebook.com",
                    "Reply asking if real",
                    "Share the link"
                ],
                correctAnswer: 1,
                explanation: "Always type the official site address yourself."
            },
            {
                scenario: "Flyer: 'Win a holiday! Scan this QR code.'",
                question: "What should you do?",
                options: [
                    "Scan the QR code",
                    "Throw away the flyer",
                    "Share with friends",
                    "Scan with antivirus"
                ],
                correctAnswer: 1,
                explanation: "QR codes can hide malicious links. Never scan from untrusted sources."
            }
        ]
    },
    email: {
        title: "Email & Message Scam Detection",
        questions: [
            {
                question: "Which is a common sign of a scam email?",
                options: [
                    "Spelling mistakes and urgent threats",
                    "From known contact with proper signature",
                    "Sent during office hours",
                    "Addresses you by full name"
                ],
                correctAnswer: 0,
                explanation: "Poor grammar and urgent threats are clear scam indicators."
            },
            {
                scenario: "Email asking to update bank details via link.",
                question: "Which actions should you take?",
                options: [
                    "Click link immediately",
                    "Check sender and contact bank directly",
                    "Ignore without checking",
                    "Forward to everyone"
                ],
                correctAnswer: 1,
                explanation: "Check sender details and contact bank through official channels."
            },
            {
                question: "Phishing emails often try to:",
                options: [
                    "Send harmless greetings",
                    "Provide company reports",
                    "Offer legitimate discounts",
                    "Gather personal information"
                ],
                correctAnswer: 3,
                explanation: "Phishing aims to steal sensitive details like passwords and card numbers."
            },
            {
                question: "Safe to open attachment from unknown sender if email looks official?",
                options: [
                    "True",
                    "False"
                ],
                correctAnswer: 1,
                explanation: "Never open unexpected attachments - they may contain malware."
            },
            {
                question: "If you suspect a scam email, best response?",
                options: [
                    "Reply for more info",
                    "Forward to IT/email provider",
                    "Delete and ignore",
                    "Click links to verify"
                ],
                correctAnswer: 1,
                explanation: "Report to IT or email provider for investigation."
            },
            {
                scenario: "Message: Won prize, provide phone number to claim.",
                question: "What should you do?",
                options: [
                    "Share with friends",
                    "Call to confirm",
                    "Provide phone number",
                    "Ignore and don't respond"
                ],
                correctAnswer: 3,
                explanation: "Prize messages asking for details are scams. Ignore them."
            },
            {
                question: "Best ways to protect from message scams?",
                options: [
                    "Strong passwords and 2FA",
                    "Share info in trusted apps",
                    "Click pretty messages",
                    "Never verify messages"
                ],
                correctAnswer: 0,
                explanation: "Use strong passwords and two-factor authentication for security."
            },
            {
                question: "Scammers never customize emails with your name?",
                options: [
                    "True",
                    "False"
                ],
                correctAnswer: 1,
                explanation: "Scammers now use stolen data to personalize emails."
            },
            {
                scenario: "Unexpected password reset link received.",
                question: "What should you do?",
                options: [
                    "Reply asking who sent",
                    "Click and reset",
                    "Ignore and verify account separately",
                    "Forward to friends"
                ],
                correctAnswer: 2,
                explanation: "Ignore suspicious links. Check account directly through official site."
            },
            {
                question: "Common goals of SMS scams?",
                options: [
                    "Improve battery life",
                    "Install malicious apps and steal data",
                    "Give free tickets",
                    "Provide weather updates"
                ],
                correctAnswer: 1,
                explanation: "SMS scams aim to install malware or steal sensitive data."
            }
        ]
    }
};