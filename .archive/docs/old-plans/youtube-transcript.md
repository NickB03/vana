tart
0:00
hey guys Google just released their new agent framework called Agent Development Kit and it is exploding in popularity
0:07
and in this ADK crash course I'm going to take you from beginner to expert so that you can go off and build your own
0:14
AI agents automate your workflows and add AI agents to your own applications
0:19
and if you're new to the channel my name is Brennan Hancock and I've helped hundreds of thousands of developers
0:24
learn how to build AI agents through my crash courses on Langchain and Crew AI so I'm super confident that I'll be able
0:31
to help you guys as well when it comes to building AI agents with ADK and to help you master ADK as quickly as
0:38
possible I've created 12 different examples that we're going to walk through in this crash course and you're going to see that we're going to start
0:44
off with the absolute basics of building an individual agent and gradually add in more advanced features until you're
0:50
building multi- aent workflows with tool callings and much more and because I want this crash course to be as beginner
0:56
friendly as possible we're going to walk through every example step by step so that we stay on the same page and so you
1:02
can see just how easy it is to actually create AI agents with ADK and to make things even easier for you I'm giving
1:08
away all the source code for all the examples you're going to see today completely for free just click that first link in the description below so
1:14
you can download the 12 examples and kickstart your 80k journey but enough talk let's go ahead and cover the 12
1:20
different examples that we're going to be building together today and then dive into creating our first agent together so here are the 12 different examples
 Example Overview
1:27
that we're going to be building together today inside of this crash course and as promised we're going to start off by
1:32
building the absolute basics and then we're going to gradually add in more complexity and features until you're
1:37
building some really cool multi- aent workflows super excited to dive into this so let's go ahead and cover these
1:43
one by one so you know exactly what we're going to be building throughout today to start off we're going to create our first agent which is a single agent
1:50
so you can understand the core principles of creating agents inside of ADK from there I'm going to show you
1:56
guys how you can add tools to provide different and more functionality to the agents you create and how you can access
2:02
some of the pre-built tools that Google provides you from there I'm going to show you how you can bring in other
2:08
models to ADK such as bringing in OpenAI and anthropic models so you're not just
2:13
stuck using Gemini super excited that ADK allows for this functionality next you're going to see how we can make sure
2:20
our agents spit out structured outputs this is super important to make sure our agents spit out you know specific JSON
2:27
structures so that we can pass it over to other APIs and tools then you're going to see how we can update and make
2:34
our agents have session and memory so that they can remember things between different conversations after that
2:40
you're going to see how we can make our agents save data specifically save their
2:45
session and memory so that when we close out of the application and open it back up these agents still have access to
2:51
things we talked about earlier so this is where we're going to start adding in some database functionality after that things are going to start to get fun
2:57
because we're going to start working on creating some multi- aent solutions where we're going to have our agents working together and we're going to
3:03
start off with the basics and then you're going to after that start to learn how we can add in you know some
3:08
session and memory to our multi- aent solutions so they can remember things as they're talking and working together
3:13
finally what we're going to do after that is add in the ability to add in callbacks and simply put when it comes
3:19
to callbacks agents have a certain life cycle of things that they do before they run after they run and while they're
3:25
running and call backs allow you to control every part of the agent life cycle really excited to showcase this
3:31
functionality and then finally what we're going to work on is talking about different workflows that you can access
3:38
inside of ADK so we're going to start off with working on sequential agents where we make sure agents always work in
3:44
a specific order agent one two then three they always work left to right next you're going to see how we can make
3:50
our agents work in parallel to our agents we're going to have three or four agents working on task in parallel and
3:55
then when they're done they're all going to come together and combine their answer and then finally you're going to see how we can add in loops to our
4:02
agents where our agents are going to continually work over and over and over until they achieve a desired output
4:08
super excited so you guys are going to go from a complete beginner to an absolute pro after going through all
4:13
these different examples so let's go ahead and dive into our first example of building your first agent with ADK so
4:18
welcome to the first example inside the ADK crash course where we're going to focus on building and running your first
 Example 1: Basic Agent
4:25
single agent and inside of this first example we're going to walk through five steps together first I'm going to cover
4:32
the core attributes of building your agent so you can understand how all the different properties work together in
4:37
order to run your agent next we're going to cover the folder structure of creating your agent and this is super
4:43
important because ADK requires a particular format in order for you to run your agents third I'm going to walk
4:50
you through the process of installing your proper dependencies in order to run all the agents that you're going to see
4:56
in this crash course today the fourth thing I'm going to show you how to do is access and download an API key just like
5:02
this so you can run your agents and then the fifth thing that we're going to cover today is running your agents so
5:08
this is where we're going to kick things off so you can begin to chat with your agents and see just how effective they are at following instructions and just
5:14
how easy it is to run inside ADK so without further ado let's go ahead and cover our first agent together so when
5:20
it comes to creating your first agent inside of ADK let's walk through each of the core components so first things
5:25
first inside of ADK you need to make sure you have at least one root agent
5:31
this is the entry point to all the requests that you're going to start sending over to all of your agents so
5:36
you need to make sure that you have a root agent from there when it comes to your agents there's a few core properties that you're going to use over
5:42
and over and over the first one is going to be the name of the agent as we run the agent later on you're going to see
5:49
this name pops up so we can say who's actually taking responsibility and generating the results for each of the
5:55
requests we send in it's super important that the name of this agent greeting agent matches the agent name over here
6:03
so you can see greeting agent inside of our folder structure it must match this name right here if they don't match ADK
6:09
is going to throw a fit and say "Hey I don't recognize this i don't see it anywhere." So let's make sure they match
6:15
the next thing that you're going to need to put in all of your agents is a model
6:20
now as I mentioned earlier you can use any model from any framework we'll talk more about this later on so you can
6:26
bring in your Claude or OpenAI but the easiest models to use are going to be your Gemini models now for this tutorial
6:31
we're going to use Gemini 2.0 no flash for everything but if you want to see all the other models that ADK or
6:37
specifically Google has to offer you can click this link right here and it'll take you over to their model dashboard
6:43
right here so you can see there are a few core models that they offer everything from Gemini 2.5 Pro which is
6:50
their smartest most powerful model they also have the 2.0 Flash which is a toned down version of it it's not as smart but
6:56
it's still really fast or they have their 2.0 no flash model which has access to all of the multimodal features
7:02
such as images audio everything else so this is the one we're going to be using throughout the rest of this crash course
7:09
but what you could also see if you want to check out on pricing you can come down one tab right here and review the
7:16
pricing for each of the models so you can see in our case we are using Gemini 2.0 no flash and you can see when it
7:22
comes to pricing for this model it cost about 10 cent per million tokens which
7:27
is wild how cheap it is for how smart this model is and then when it comes to output prices you can see it cost 40 so
7:33
all around this is a super super affordable model and it's insanely capable as well and it has a 1 million
7:39
token context window which is insane for how much information we can pass into this model okay enough about the model
7:45
though let's go go go back and cover the two other properties that you're going to see in every agent going forward so
7:51
the next property is going to be the description now the description will come more in play as we create our
7:57
multi- aent solutions but basically when we're working with multi- aent solutions the root agent is always looking to say
8:04
hm I'm trying to work on this task what other agents do I have access to that
8:09
would do a better job at working on this task so this description is a highle
8:14
basically job overview of like hey I am this agent and here's what I specialize in doing and if you know if it was a
8:22
copywriting agent so someone who specialized in writing the agent would go oh I'm working on a writing task
8:27
right now cool I need to delegate to this other agent long story short it is to help agents figure out who they
8:33
should delegate work to in a single agent though there's no delegation so we wouldn't need it okay now the final one
8:38
and the most important one is going to be the instructions and the instructions are just like it sounds like these are
8:43
the instructions for telling the agent what it should do and how it should do it so you're going to see as we go out
8:49
throughout the rest of this tutorial how we add in some really complicated instructions and Gemini 2.0 Flash is
8:54
just going to handle it like an absolute charm so now that you've seen the core attributes of an agent let's go ahead
9:00
and start talking about the folder structure and why things are set up the way they are so here's everything you
9:06
need to know about the folder structure of working with agents inside of ADK so first things first inside of every
9:12
project we work on we're going to put our agents in folders just like this and
9:18
we are going to have a few core components in each one we're going to have an init.py file and we're going to
9:24
have av and we're going to have an agent so let's walk through what each one of these does at a high level when it comes
9:30
to our init.py file this is basically telling Python hey I have some important
9:36
information in here that you need to look out in the case of our ADK agents we're saying "Hey in this folder that's
9:43
what the dot means i have an agent that you need to work on importing." So this agent is basically pointing at this
9:50
agent.py right here okay so that's the important thing an ADK it needs to know what agents it has access to all right
9:56
the next one that you need to look at is thev file thev file is where you're going to store all your environment
10:03
variables for your agents and all the other projects you work on now what's important to note is you only need to
10:09
have one EMV file and you need to keep it inside of your root agent and in this
10:14
case we only have one agent so we only have to put it one place basically it just goes in the root agent however
10:20
later on you'll see whenever we start to work on multi-agent solutions we're going to have a bunch of agents and you
10:26
don't need to put a&b in all of them you just need to keep it in the root one so hopefully that makes sense and then finally the other thing is you need to
10:33
have your agent.py file and a quick reminder you need to make sure that the name of this agent matches the folder it
10:41
has to be 1:1 or else it's going to throw some errors at you and to make your life easier speaking of a while
10:46
back when I was showing thev file is I've created example for you so when you're working on this on your own
10:52
you're just going to rename this toenv instead of example and then you're going
10:58
to paste your API key here yeah so that is the folder structure at a nutshell now what I want to do is walk you
11:04
through how you can install all the dependencies to actually run this agent so in order to do that let me show you
11:11
all the different commands you need to run and I've got some source code and instructions to help make this even easier for you guys so when it comes to
11:17
installing all the dependencies in order to run this crash course I've tried to make it as easy as possible for you guys
11:23
so first things first there is a requirements.txt file and basically all this does is it calls out the different
11:30
packages that we want to install the most important one is obviously Google ADK because this is what's going to give
11:36
us access to the agent development framework from there I have a few other different libraries and dependencies
11:42
that you guys are going to need and you don't need them all now but I've tried to set it up so that you guys only have
11:47
to run the install command once and then you're good for the rest of the project okay so what we need to do is follow
11:53
some instructions that I have set up for you guys to create an environment now if you're very new to programming basically
12:00
when it comes to working with Python every time you work on a project you want to create an environment that
12:06
environment is going to install and contain all of the different libraries and dependencies you need the reason why
12:12
you want to do this is because each project has its own requirements and you don't want to accidentally install all the requirements from project A B and C
12:19
into one environment because it's going to just cause a ton of errors so we're going to create a single environment for this install all the required
12:26
dependencies and then we're good to run everything so here are the step-by-step instructions to create your virtual
12:31
environment and you can find these by looking inside of the root folder of the crash course i have a read me right here
12:36
for you guys so here are the commands we're going to run together one at a time so the first one is we are going to
12:42
create a virtual environment inside the root directory of your project though you can open up your terminal and type
12:48
in the command right here python make a virtual environment and then put the virtual environment in thevnb folder so
12:55
I'm going to run this and I'm going to show you what it does so it just ran and now you can see in the top left corner
13:01
of your file explorer you can see we have a new folder it's a blank virtual environment that has a few key
13:07
components of what's necessary to run a Python environment now from there what we can do is we need to activate this
13:14
new environment so I'm on a Mac so I'm going to run this command but if you're on Windows you can run these commands
13:21
right here so let's go ahead and paste it in and what this will do is it will now say hey you are now working with
13:27
this virtual environment right here and this is where what's going to allow you to install all of your dependencies i
13:33
actually just really quickly need to get out of another environment deactivate you don't need to run that command i
13:39
just needed it i was uh in a weird state okay cool so now that we have everything set up what you can do is install all of
13:46
the dependencies and what this will do is it will install all the dependencies and put them inside your virtual environment so you can see right now we
13:53
barely have any packages in here but when I run this command what it's going to do is it's going to install
13:58
everything that we called out right here all of these and you will see in just a second this virtual environment is going
14:04
to include a ton more packages everything from Google ADK some stuff to look up finance stocks that we're going
14:10
to do later on and yeah tada it now has a ton of additional packages okay great
14:15
so that is pretty much set up and now what we can do is we are officially done with installing all of our different
14:21
Python requirement packages in order to run this project so tada everything is done so now we can move on to step four
14:28
which is where I'm going to show you how you can access an API key to run everything that we're going to be
14:34
working on today so let me quickly walk you through how you can create your own API key so what we can do is follow the
14:40
rest of the readme instructions and we're going to walk through these steps right here so first things first is we
14:46
need to go over to Google Cloud and create an account so what you'll do is
14:52
hop over to Google Cloud just like this and you'll need to sign up and create account if you haven't once you do
14:58
create account you'll click console and this will take you to this page right here where you're basically in your root
15:04
dashboard and what we want to do is click in the top lefthand corner because we're trying to create a project we want
15:10
one project to run all these examples so we'll click create new project and I
15:15
will call this we'll call it YouTube ADK crash course just like this and what I
15:23
can do from there crash course and then what you can do from there is you might not have a billing account set up you
15:29
will need to create one and this is what will be charged to as you create your
15:34
own request inside of this examples cuz if you remember Gemini Flash 2.0 costs
15:39
like 10 cent per million tokens so it's going to like you might get charged a penny by running all this project but
15:45
you need to create a billing account now if this is your first time creating a Google Cloud Platform account you'll probably get a bunch of free credits so
15:51
you might not have to go through this process but I still just want to show it to you so once you're done you're going to click create and then tada it's going
15:58
to create all of your project and all the necessary underlying assets for it
16:03
and you can see once it's fully done you can click select project and what this will do is in the top lefthand corner
16:09
you can now see that you are working on the project you just created great so let's head back over to our instructions
16:16
because we just checked off one and two and now we want to create an API key so we're going to go to this link so I'm
16:22
going to go ahead and paste it in and it will take us to a page just like this now you might have to sign up for AI Studio it's a little weird i can't
16:28
remember if you have to sign up for Google Cloud and both so you might have to do an extra sign up step but the important thing is you can now click the
16:34
create API key button so we're going to click this create API key and we are going to type in the name of our project
16:41
which is YouTube ADK crash course once this is done it's going to say create API key and it should take just a few
16:48
seconds to create that API key but you need to copy it so great we're going to copy it and please don't share this with
16:54
anyone else i'm going to delete mine right after the video but click copy and you are going to go over to your VNV
17:02
file so basics agent greeting agent and paste it right in here so this is how
17:07
you're going to set up your agent and and actually have it access your API keys that you just set up fantastic so
17:14
we're now good and you can refresh just to make sure it all worked fantastic so now if you look at mine it's going to
17:21
say YouTube ADK crash course and mine was already hooked up to a billing plan cuz you just walked through that with me
17:26
as well so you are good things are great you can now start to use this API key to make request so now we're at the final
17:33
step which is going off and and running the actual agent itself so you can see it in action so let me show you how you
17:40
can start to do that and the first things first is we are going to clear out our terminal so that we can run our
17:46
special commands to get everything working so in order to run this agent the first thing we need to do is change
17:51
directory to make sure we are inside the basic agent folder so you're going to cd
17:56
and go into the basic agent folder great so if we look in here yep we can see we have our greeting agent things are
18:02
looking good now the special command that we are trying to run is called ADK
18:07
this is the CLI command line interface tool for using agent development kit so
18:12
if you just type in ADK by itself it's going to show you all the different options that you can run so you can run
18:18
these all of these right here now let's walk through them and then I'm going to show you the one we're going to use so first things first you could run the API
18:25
server and basically what this will do is it will create a endpoint so you can
18:30
start to make API requests to your agent so you'll be able to do like a quick request to like localhost slash API
18:39
slash and then make a request to your agents so that's what you could do there the next one is you could run adkreate
18:45
and this would create an agent folder for you we have already have everything set up so you don't need to run create
18:51
then it has a few extra commands you can run such as deploy which will deploy your agents to the cloud i have a full
18:56
tutorial on that definitely recommend checking that on my channel then you have eval which is basically like running test against your agent a little
19:03
outside the scope of this tutorial but I'll have one coming up later the next one is run which will run the agents
19:10
inside your terminal so you would be typing inside of your terminal right here to chat with your agents and the best one that we're going to be using is
19:17
ADK web and this will spin up a really nice looking website for us to chat with our agents and give us access to seeing
19:23
a lot of the underlying events and state and everything else that's going on inside of our agents so let me show you
19:30
how you can run this so we're going to type in ADK web and what this will do is
19:36
spin everything up and you can now see all right great your web server has started you can go to this link to
19:42
access the agents so we're going to hop over to our browser go over and you can
19:48
now see that we have our web server up and running and we have access to our agents so let me give you a quick
19:53
overview of what's happening and then we're going to start chatting with it so up in the top lefthand corner you have
19:59
the ability to pick which agent you want to talk to in our case we only have a single agent so it auto picks oh you're
20:05
trying to chat with the greeting agent now we're going to talk about a lot of these later on but just know events are
20:12
as we chat with our agent you're going to be able to see like oh event one happened where we were trying to figure out who to work with and we made a
20:18
response and you can see in real time all the events that happen state this is where we are going to store information
20:24
with our agents we're going to hop on to this in module five artifacts outside the scope of this tutorial a session a
20:31
session is nothing more than a series of messages between us and the agent so you know we can create multiple sessions to
20:38
where we can have multiple different chats with the agent and then the final one is vows but we're not working on that in in here okay so let's go ahead
20:45
and start testing out this agent and as a quick reminder this agent we have told
20:51
it to follow these instructions you are a helpful assistant that greets the user ask the user's name and greet them by
20:57
their name so what we can do is say hey how are you and then we can see the agent follows these instructions to make
21:04
things a little bit more personal what's your name my name is Brandon and from there the agent will go hey Brandon it's
21:11
greeting me by name and you can see it actually working and following these instructions now speaking of what I was
21:17
talking about earlier is events so every time I made a request you could see these events in real time and this is
21:23
one of my favorite parts of ADK is their the ADK web feature because it allows
21:29
you to explore what's happening with the agents in a super interactive fashion so you can now see all right for our first
21:35
event we only had one agent up and running and you can see the message that was passed into it sorry you can see the
21:42
response from the agent and if you were to dig deeper into the event you can see
21:47
the request and the response in the request you can see the a few things you
21:53
can see the initial instructions so this is were the initial instructions that we passed in and it also adds the
22:00
description of the agent as well so basically it's taking this information
22:05
right here the description and instruction and putting it all into the system instructions that's what it's
22:12
doing under the hood and then you can see the initial message we gave it so hey how are you that's what's popping up right here and then finally you can see
22:19
in the response it generates the response so yeah that's everything that you need to know when it comes to
22:24
creating and running your first agent and just as a quick reminder you guys are now a pro at understanding how to
22:32
create an agent the core properties you're also a pro at understanding the folder structure of why we need to set
22:38
up things the way we need to do you know how to get your API keys and you know how to run your agents so what we're
22:45
going to do next is hop over to the second example where you're going to start to see how we can add in some tool
22:50
functionality and access some of the cool pre-built tools that Google gives us super excited so you could see this
22:56
in action and start leveling up your agents let's go ahead and hop over to example number two hey guys and welcome to example number two where we're going
 Example 2: Tools
23:02
to look at adding tools to your agents so that you can add in additional functionality and supercharge your
23:08
agents and in this example we're going to walk through four different items first we're going to cover the different
23:14
types of tools you can use with your agent because ADK is super flexible next I'm going to show you how you can
23:20
actually add these tools to your agents third we're going to cover some of the best practices that you need to know
23:26
about when building your custom tools and then we're going to also cover a few limitations that you need to know about
23:32
when building tools and then fourth we're going to go off and run one of these agents with some tools so you can
23:37
see everything in action so let's go ahead and quickly cover the three different types of tools you can use
23:42
inside ADK so the three different types of tools you can use inside ADK are function calling tools you can use some
23:49
built-in tools provided by Google and then you can use thirdparty tools so let's walk through each one of these one at a time so when it comes to function
23:55
tools this is what you're going to be using 99% of the time this is where you create a Python function that you then
24:01
pass over to your agent so you can say "Hey like go find the weather go look up stocks whatever you want to do." This is
24:08
what you're going to be doing most of the time where you create your own custom Python functions now you could also use agents as tools this one is a
24:15
little bit more complicated and you'll see it in action later on when we work on multi-agent solutions but there is a
24:21
scenario when you'd want to wrap an agent as a tool we'll talk about that later then there are longunning function
24:27
tools this is a little out of scope of this crash course cuz it gets a little bit more complicated but just know it is
24:32
possible the next thing that you can do is use some of the pre-built tools Google provided such as Google search
24:38
code execution and then rag in this example we're actually going to look at how you can use Google search inside of
24:45
your tools which is super powerful that you get it out of the box a few important things to note before we dive
24:50
in built-in tools only work with Gemini models so if you're using OpenAI or
24:55
Claude any of those these built-in tools will not work i had to find that out the hard way and the third option is to use
25:02
thirdparty tools so if you've used the lang chain or crew AI you can easily add in some of the tools in the libraries
25:09
for these different frameworks and bring them over to ADK a little outside the scope of this but just know it is
25:15
possible and basically ADK is trying to make it as open as possible to all the models and tools that you could ever
25:21
want so you can easily build agents and get them up and running so now that you've seen the different types of tools we can use let's hop over to the code so
25:28
you can see how you can start to add tools to your agents so let's go ahead and hop back over to the code okay so
25:33
here is a super simple example of an agent using the Google search tool now I
25:38
do want to call out a few things just because we are still working our way up on becoming an ADK pro so per usual we
25:45
are inside of a agent folder this one's called tool agent so that's why we call
25:50
this tool agent they must match like we said earlier we've picked the model and we've given a description just like we
25:56
normally do and the main change that you're going to notice now is we've created a new property and added it
26:02
called tools this is going to be a list of all the different tools you want to
26:07
use with your agent and in this case we are going to use the pre-built tool from
26:12
Google search and as mentioned just a second ago there are some additional built-in tools that you could use so
26:19
there is the Vertex AI search so if you're going to be doing any rag queries you can do this as well and there's also
26:25
the built-in code execution tool now it is important to note that when using
26:30
agents just like this you can only pass in one built-in tool at a time so you
26:36
could not do the Vertex AI search capabilities plus the code execution capabilities you can only use one
26:42
built-in tool at a time so that's super important to note as you're creating these agents and working with built-in
26:47
tools so now that you've seen a built-in tool I want to go ahead and show you how you can also add in some additional
26:54
tools as well so one of the other types the first type that we talked about was adding in your own Python code as
27:01
functions so let me show you what that looks like so what you could do is create a function called get current
27:08
time and let me walk through a few of the important things so we can get this up and running so we can do let me get
27:13
all the imports working so you guys can see it in action fantastic so here is another example of a tool and this is
27:21
why I like this one so much so you can see in order to create your own custom
27:26
Python tool all you need to do is make a function you need to specify a few other
27:32
things you need to specify the return type you need to specify a dock string a
27:37
dock string just in case you're not familiar with it this is how the agent determines what the function does and if
27:43
it should call it so if we give it a command saying hey please fetch the current time well the agent will look
27:50
through all the available tools that we have down here and it will see like oh I
27:56
can see right now that I have access to the get current time tool so I know because I have access to this tool and I
28:02
know what this tool does yes this is the tool I need to use to solve this problem now there are a few other things when it
28:08
comes to best practices that you need to know when creating tools first things first whenever you are returning the
28:16
results of a tool the agent framework wants you to be as specific and as
28:23
instructional as possible and sorry if that's not a word but what I mean by that is it's super common for a lot of
28:29
the time when people want to return stuff is they'll just go "Oh okay i'm just going to return the results." Well
28:35
you don't want to do this because when the result gets passed back to the agent
28:40
it's not going to know like well what is this like did you give me the current time what what is this so when you are
28:46
returning results back to your agent so that it can read the results and use the results in the answer it generates you
28:53
want to make sure the dictionary you create is as robust as possible and if for whatever reason you do return
29:00
something just say like this for example let's just say you return hello what ADK is going to do under the hood is it is
29:08
going to wrap the return statement into a to something like this where it's going to do result and then it's going
29:14
to do hello so ADK is going to do its best to wrap the results and it's always going to convert it to a dictionary just
29:21
like this so we want to be as helpful as possible and instead of ADK having to do the work and just saying generic result
29:28
we want to say no this is actually the current time this is the key and this is going to be the value now a few other
29:34
things that didn't show in this example is sometimes you want to pass in variables so whenever you want to pass
29:41
in variables what you can do is just say I want to do format and then what you
29:47
can do is pass in the type of it so in this case we want to do a string now
29:53
what you can notice is my current time function now includes a default value
29:59
this is what a default value looks like it's when you have a property or a parameter and then you pass in some
30:05
values after it default properties do not work inside ADK at the time of this recording so never add in default values
30:13
they won't work and things will break so instead what you want to do is just pass in your properties with the types just
30:20
like this and use them however you want okay cool so you've now seen how to create a tool and you've seen how easy
30:26
it is to add tools to your agents the only other thing I want to mention when
30:31
it comes to some limitations is ADK when it comes to built-in tools is super
30:37
particular meaning if you wanted this tool to search to use Google search great that could work if you wanted to
30:44
work with current time and add in a few extra custom functions great you can do that but what you can't do is add in
30:52
built-in tools with custom tools adk breaks whenever you do that so I just wanted to call out this before we
30:59
actually used it so that you could understand some of the limitations cuz when I was playing around with ADK for the first time and this was breaking on
31:05
me I could not understand why it was breaking so hopefully that saved you some heartache so now that we've covered some of the best practices on creating
31:13
tools and you've seen how to add tools to your agents let's go off and run
31:19
these different agents with the different tools so you can see them in action and to start off we're going to start with Google search and then we're
31:25
going to test it again using the current time so you can see it you can see it working so let's get this up and running so we can work with Google search we're
31:31
going to head over to our terminal and start running it so the first thing we need to do is open up our terminal and
31:37
what we want to do is make sure two things are happening one you want to make sure you've activated your virtual
31:42
environment head back to the beginning of the video to check out instructions for to do that and the second thing is
31:48
you want to make sure you change directory to the tool agent folder so this one right here once you have that
31:53
set up you can run ad web and this will once again spin up a website that allows
31:58
you to interact with your agents now you can see that we have an updated agent here which is the tool agent so I can
32:05
say hey do you have any news about Tesla this week and what this will do is go
32:12
off search the internet using the Google search tool so you'll see in just a second you can see yeah right here so
32:19
you can see the tool we called so it's the Google search and it looked up specifically this query Tesla news this
32:26
week and from there it generated a basically a nice result that we can ask
32:31
questions about so you can see like oh the stock did this here's what happened for the Q1 results basically everything
32:37
that happened this week in Tesla and what's so cool is you can dive into all the different events that happened to
32:43
see what was going on under the hood so per usual click on the event and you can see the tool agent now has new
32:51
functionality so the tool agent now has access to the Google search tool and when you look inside of it you can see
32:58
per usual you can see the instructions we gave it and you can see the query we passed in and when you look at the
33:04
response you can see when we scroll down just a little bit you can see oh it went
33:09
off and searched all these different websites for us scraped all the information from a Google search and
33:14
then gave it back to us so this is when we're starting to see the power of using tools inside of our agents so this one
33:20
worked pretty well what we're going to do now I'm going to close out of this and we are going to change up the agent
33:25
to start using the get current time tool so you can see this one in action so we're going to do get current time we
33:32
are going to keep this one just how it is and now what we're going to do close the kill the server try it again adk web
33:39
this will recreate the server once again so we can check out our website we'll open it up so we still have a tool agent
33:45
and now we can say hey what is the current time and when we run this one
33:52
we'll see a different type of function calling so the last one was a built-in tool call and now what we're doing is
33:58
we're triggering our custom tools so you can see we sent an event to get current
34:03
time and then we got back a result from get current time and the final answer was formatted and sent back to us so all
34:09
around super super nice super helpful and per usual we can check out the events to see exactly what went down so
34:16
we can see in the first event our tool agent now has new tools in this case get
34:21
current time and we can look at the request we can see our updated request we can see the message we sent over and
34:27
then we can check out the response and this time you can say hey I'd like to do a function call to what function oh the
34:33
get current time function the one that we just passed in and we can step our way through the different events to see
34:39
what's going on so in the second event you can see we're waiting for tool calls to happen so this is basically yeah it's
34:46
making a call and then the third event you can see okay I got the result from current time and you can see here what
34:52
is the final result so yeah that is tool calling in a nutshell and don't worry we're going to be adding in a lot more
34:57
tools throughout the rest of this examples inside this crash course but to start off I just want you guys to see
35:04
the basics so you can see how everything works together how to use built-in tools custom tools everything else so you now
35:09
have leveled up as an ADK developer and now we're going to move over to example number three where you're going to learn
35:15
how you can bring in OpenAI models and models from Claude inside of ADK so let's hop over to example number three
35:22
welcome to example number three where you're going to learn how to connect your ADK agents to other models like
 Example 3: LiteLLM
35:28
OpenAI and Claude and in this example we're going to first walk through a few
35:33
of the core technologies you need to support this functionality so we're going to head over to light LLM and open
35:40
router to understand what they are and how we need to use them from there we're going to dive into the code so you can see how you can configure everything up
35:47
and then finally we're going to run the agents using these new models so you can see how everything works together so
35:52
let's go ahead and head over to looking at Open Router and Light LLM all right so the first technology we're going to
35:58
be using to connect our ADK agents to all sorts of different models is Light LLM and in case you haven't heard of
36:04
Light LM before it is a free library that you can use that handles all the complexities of working with different
36:11
models like OpenAI Claude Llama it handles all the complexities with each one of them and gives us one nice
36:18
library to interface with all of these different models so here's just a quick example of what it looks like to work
36:24
with Light LLM so as you can see like I said it is a package but under the hood
36:30
all it's doing is you pass in a model so OpenAI claude whatever model you want to
36:35
use you pass it in right here and then you just pass in a message that's basically how light LLM works and under
36:41
the hood it is handling all the different connections and all the different types and functions to make your life as easy as possible so that's
36:48
the first technology we're going to be using cuz ADK actually imports light LLM you're going to see in just a second and
36:53
it makes it even easier than what you see right here the next technology we're going to use is Open Router now Open
37:00
Router is a tool that allows us to purchase tokens that can be used for any
37:06
model so it is basically one tool that allows you to connect to OpenAI Claude
37:12
and these are actually to make requests over to the different servers so you can look up any model that you want so we
37:17
can look up OpenAI 04 Mini and you can see yep I have access to this model
37:23
here's some information about this model it is currently working and here's how fast we're getting for tokens per second
37:29
right now and it carries some cost now Open Router is not a free tool it does cost money to use and what you can
37:37
notice whenever you sign up for an Open Router account because you need to do it so you'll just head over to Open Router
37:42
sign in and what you'll do is you will buy credits and whenever you buy credits there's like a 3% or 5% increase on the
37:50
cost to use credits and outside of that you can just use these tokens and credits to make requests to Gemini
37:57
OpenAI Claude whatever you want to do so make sure you go ahead and add in some credits here so just add credits once
38:04
you're done what you'll do is you will create an API key this API key is going to allow you to have one key that you
38:11
can use to access every model which is the beauty of using open router so what we can do is click create key and we
38:18
will call this ADK crash course and we'll click create and now we will get
38:24
an API key so copy this API key and you will want to head back to your code and
38:30
we are in project number three so you'll want to go down to yourv and you will
38:35
paste in this open router key and that's all you need to do in order to get things up and running so now that we've
38:41
covered the core technologies and we have you a open router key let's go in and actually look at the agent so you
38:48
can see what we need to do in order to start communicating with these different models so let's hop over to the agent all right so we just opened up our
38:54
agent.py that's using light lm so I want to cover a few of the core changes that we're making in order to start working
39:01
with other models so first things first we need to make a import to use light
39:07
LLM and we can see we're importing this from Google ADK and then specifically
39:12
when it comes to the model we want to use we are using light LLM because light LLM is one interface that allows us to
39:19
communicate with all the different model providers out there now when it comes to using light LLM there's pretty much for
39:26
most technologies and models out there you only need to provide two pieces of information the model and the API key so
39:33
let's look at the model first when working with light LLM what you need to do is first define the provider so since
39:40
we are using open router we need to define the provider first so open router check the next piece of information we
39:47
need to define is the model family so in our case we're wanting to check out OpenAI so we want to put OpenAI here if
39:55
we were wanting to use Claude we would put Anthropic here and then once you're finally done you want to put in the
40:01
specific model that you're using so in this case what we're saying is hey I would like to use the new model from GPT
40:07
4.1 and we're wrapping it all inside of this class and what's so nice is all we
40:13
have to do is pass this model we create into our agent and that's all we need to do to get it to work now the other piece
40:19
of information that you'll notice in here is we are saying hey I would like to look at my operating system and I
40:26
would like to get a specific environment variable in this case I would like to get the open router API key so if you
40:32
look in thev file that we created just a second ago that's exactly what we're doing we're just pulling out this API
40:38
key to use in our agent great so let's look at what we're trying to do with this new model so we can run it and see
40:45
in action so in our case we are creating a dad joke agent so dad joke dad joke
40:50
and we're saying hey you are a helpful assistant that tells dad jokes please only use the tool get dad jokes to tell
40:57
a joke so here's the custom function that we've created it's a list of jokes
41:03
just basically like knock-knock jokes and we're saying hey please randomly pick a joke from this list that's all
41:10
it's doing so what we can do is start running this agent so you can see it in action so per usual we are going to open
41:17
up our terminal we need to change directory to the proper project so we're in example number three and then we can
41:24
run adk web adk web will spin up our terminal or basically our web interface
41:29
so that we can check out our new agent in action so you can see great we have dad joke agent and we can say hey please
41:38
tell me a joke and this will go off and do exactly what we did in the previous
41:43
tool calls where we went off and made a a request to get the dad joke we got the dad joke back and then finally it
41:49
returned the dad joke from our tool call so all around this is awesome and the crazy part is we're not using Gemini for
41:55
this we're using Open AI and as a quick extra note because I want to be as helpful as possible for you guys if you
42:02
want to see all the different compatible models for open router I have a link that you can see in the source code so
42:08
let me show this for you real fast but this link right here will take you to light LLM docs so you can see how to
42:15
connect to Open Router and here's a list of some of the most popular models you can chat with so you can see everything
42:21
from OpenAI you can see we have our cloud models down here but if you want to check out the full list of compatible
42:28
Open Router models you can click here in the docs and it'll take you over to Open Router we looked at this earlier but you
42:35
can type in any model you want so if you wanted to use something from llama you can type in let's just say we wanted to
42:42
do llama 4 so what we can do here is you can see okay cool i'd like to use this
42:49
one so if we wanted to use this model what we would type in is we would go okay I would like to use open router
42:57
open router for slash and then I would type in meta llama/ the name of the
43:02
model so just know before you use any of these models right here you always need to add open router before it to properly
43:09
use it in your agents yeah you have access to all models that are available and if you just want to experiment you
43:16
can click on the rankings in Open Router and see what models are absolutely crushing it so you can try them out for
43:22
your own so yeah all around Light LLM plus open router is a huge cheat code when trying to interface with all sorts
43:28
of models to really expand the capabilities of working inside of agent development kit so yeah that's a wrap
43:34
for example number three and now we're going to move over to our next examples which is focused on structure outputs to
43:41
make sure our agents generate the proper type of data we wanted to spit out so let's go ahead and hop over to example
43:46
number four hey guys and welcome to example number four where we are going to look at the different ways we can
 Example 4: Structured Output
43:52
make sure our agents generate the proper structured data and this is going to be super important as you build larger and
44:00
larger agent workflows because you want to make sure agent A is producing the correct information in the right format
44:05
for agent B or so you can take the information from agent A and pass it over to an API another tool or whatever
44:11
you want to do so structured outputs are super important so what we're going to do is first look at the docs to see what
44:16
options we have available to us and then second we're going to look at a pre-built agent I've created for you guys so you can see the structured
44:23
outputs in action and see what we have to do to get it up and running and then finally we're going to run the code so
44:29
you can see everything in action so let's go ahead and check out the docs okay guys so let's dive into the structuring data docs when it comes to
44:36
ADK now we're going to walk through the three different options real fast and I'll give you my feedback on all of them
44:42
and just to give you guys a brief overview before we dive into the code and see these guys in action so the
44:47
first option you have is to define input schema i personally dislike this one because it's very easy to fail for
44:54
example if a the previous agent is saying "Hey I need to give you this
45:00
information." And we say "Cool i'm expecting this other type of information." Things are going to break so this one's a little bit too rigid so
45:06
I usually try to stay away from this one but there is another format that you're going to be using all the time which is
45:12
going to be output schema and basically what output schema does is it says okay AI agent I would like you to create and
45:21
generate an output that looks like a specific class so for example they have a great demo down here where you can say
45:28
okay agent I would like you to please generate a output in the form of a
45:34
capital output so this is a class we define and you can see up here when it
45:40
comes to the model it is a base model imported from pedantic that's exactly what the doc said and what you can see
45:46
inside of it is we go "Oh okay i want this agent to return a JSON object that
45:51
has a single property in inside of it a capital this capital will have a string." And I know that basically some
45:59
additional information to help the agent figure out what it should put here is a description of it so I can see oh okay
46:05
the agent is going to whenever we ask it a question return a object that has a capital and the capital always needs to
46:13
be the capital of a country so that's basically output schema in a nutshell
46:18
there is one quick constraint so this is something you need to know before using this in the wild it is you cannot use
46:24
output schema when using tools or transferring information to other agents
46:29
so later on don't worry what we'll do is we'll have agent one we'll just have agent one do all the complex thinking
46:36
pass the raw results over to agent two and then agent 2 will be the one responsible for making sure the output
46:41
schema is met okay now here's the final thing when it comes to output key this is a special name we can give to say hey
46:50
I would like to store all the information you generate from here to a specific spot in state now we haven't
46:56
talked about state yet we will more in the next section but just think of state as memory that all of your agents can
47:01
access so what you can say is okay great this agent is going to find the capital
47:08
it's going to make sure the output looks like this it's going to be an object that stores a capital name and what it's
47:14
going to do is it's going to save the capital to state so what we could do is
47:19
eventually look up state.found capital and when we look up the found capital we
47:25
will be able to see the result that was generated here and our other agents will be able to access this information and
47:30
this is one of the best ways to help you know agent one generate information and agent two look up what the previous
47:37
agent did use that information for the next so this is how we get to basically start having one shared area with all of
47:43
our information and all of our agents can access it and it's very structured so we make sure that our agents always
47:49
have access to the information they need so that was a ton so let's actually look at a real world example so you can see
47:55
this in action so let's hop over to the code okay so now we're in the code when it comes to working with structured outputs and I promise a lot of those
48:01
initial concepts we talked about are going to come together and make sense so as you saw earlier there was a few
48:06
important things that we needed to add to our agent to get structured outputs
48:11
working the two most important ones were output schema so this is what's going to define yes you need to return a object
48:20
of this class type and you can see for this agent we defined our email content up here so just a quick bit of
48:26
background in this example we're trying to say hey agent it is your job to take in some text I give you and convert it
48:32
into an email that has two options or two properties it has to have a subject line and it has to have a body so every
48:39
time we give the agent information it will always return this type of structured data now so a few other
48:46
things that are important to note before we dive too deep into the instructions you must for best results when working
48:52
with agents whenever you're using an output schema like this you need to do a
48:58
good job of defining what the schema is beforehand so for example in the
49:03
instructions you need to do a good job of saying "Yep I would like you to return JSON matching this structure
49:10
subject and body." That's exactly what we defined up here but we need to put it in our instructions as well the reason
49:16
why we need to do this is if we don't tell the agent what type of data it needs to return whenever the agent
49:22
generates its draft of like yeah I think I need to return this information well whenever it gets to the final step and
49:28
it goes okay here's my raw data i'm going to try and you know basically change it to fit this output schema if
49:34
it doesn't able if it's not able to make that match things will just fail and it's going to say hey I was unable to generate this output schema and things
49:40
just crash so the better job you can do when defining the output schema in here the more likely your agents will do at
49:45
succeeding at generating this this information properly okay cool so that was super important to note now let's
49:51
just quickly look at the instructions and then we're going to run it so you can see how I was talking about state earlier with output keys yes state with
49:58
output keys you're going to see how the email we generate actually gets saved to state using the email as the word the
50:04
keyword and you're going to see the email it generates as the value so you'll see this in action in just a second but let's quickly look at the
50:10
instructions so you can see exactly what we're doing we're saying "Hey you are an email generation assistant you always
50:15
write professional emails based on the user's request and here are some guidelines when you're writing a email
50:21
you need to make sure that you always create a concise and relevant subject line and then the body of the email
50:26
needs to be pretty professional with a greeting and then finally what you want to do is make sure the tone is
50:32
businessfriendly formal keep it concise but complete and then as we said earlier as a must please please please make sure
50:39
you include the JSON structure for best results okay great that's everything that we need to do so let's run the
50:46
agent so we can see this in action so we are in the proper folder structured outputs we have our virtual environment
50:52
created so we can now run ADK web this is going to spin up our website that you normally see and I'm super excited to
50:58
show you guys this in action because as you build your own agents you will see quickly how powerful and how important
51:05
this is in order to build bigger more complex workflows so we can say "Hey
51:10
please write a email to my wife
51:16
Carly to see if she is available for coffee tomorrow morning." So what it's
51:24
going to do is take in that input that we gave it and you can see the agent returned the two pieces of information
51:31
we wanted the subject it also returned the body cuz that's exactly what we defined in the schema now digging even
51:38
deeper you can see inside a state we now are saving the email we generated in the
51:44
exact format that we said so in our case we said "Hey I would like you to save the email using the key email and then
51:52
the body like whatever response you generate you need to save it in here." And the reason we can see this is
51:57
because if you hop back over here at our agent you can see yep the output key was
52:03
email it's right here and then the generated result is spit out right here now just to show you guys something else
52:09
is if we were to write another email it will override this state so you can say
52:14
great see great we'll say write another email to see if Nate is free for pickle
52:24
ball tomorrow night now this will create another email and it will save the
52:30
result once again to state so you can see new subject line new body but it's
52:35
all saved under the same key so that is working with structured outputs in a nutshell to where you now have total
52:41
control of making sure your agents always generate the proper output schema and save the information exactly where
52:47
you want in state so other agents can use it or you can pass that information over to other tools and APIs so that one
52:53
was a little bit more complex hopefully the explanation made sense and now we're going to move over towards our next
53:00
example where we are going to start to look at some of the core underlying pieces and concepts inside of ADK which
53:07
are going to be session and memory so let's hop over to example number five so welcome to example number five where
 Example 5: Session, State, & Runner
53:13
we're now going to look at some of the core components you need to use in order to run your agents so in this example
53:20
we're going to look at sessions state and runners and to make this all super easy to digest what we're going to do is
53:27
break this up into three phases part one we're going to hop over to a whiteboard so you can see how all these core
53:33
components work together and what they do so you have a good understanding of it and once we have a highle understanding of what these components
53:39
are we're going to dive into code in phase two where you're going to see okay I understand what a runner is now but
53:44
how do I actually create it in code well that's what we're going to be doing in phase two and then part three we're going to kick off the code that we run
53:51
so you can see how it actually works and so you can see you know some of the outputs of everything running together
53:56
so let's go ahead and hop over to the whiteboard so we can deep dive into some of these core components so welcome to
54:01
the whiteboard time guys where we're going to start diving deep into understanding what is session state and runners and how do they all work
54:07
together and the good news is you've already been using each one of these different technologies and core concepts
54:13
whenever you've been running ADK web so far every time we run ADK web it handled all the complexity of spinning up all
54:20
the back-end code that created sessions for us so as you can see you know every time we were working and chatting with
54:26
our agent it created a unique session for us we'll explain that more in just a little bit you can also see that it had
54:31
state for us and then every time we were chatting with our agent we were really passing our inputs and questions over to
54:38
a runner who was connecting everything together for us so enough like highle talk let's actually see what these
54:45
different components are and what I would like to do first is talk about sessions once we talk about sessions
54:50
we're then going to talk about runners so you can see how these different core concepts work together okay so a session
54:56
inside of ADK is nothing more than really two major pieces of information a
55:02
session has a state so a state is where you can store all sorts of information
55:08
in a dictionary where you have keys and values so keys could be like username and the value of username would be
55:14
Brandon so that's what we're storing in state outside of that inside of a session we have events and think of
55:21
events normally just like a message history between us and the agent but
55:26
there's actually a little bit more to it than just messages there is also tool calling and agent responses and the
55:33
event history is just a list of everything that happens between us and the agents and it's a nice way to store
55:40
all the information so that every time we add a new message to the bottom it can look back at everything we said so
55:46
far and understand oh okay I see we've been talking about this topic so if you ask for more information you want me to
55:53
provide more information on the conversation we were just talking about so sessions at a high level so far state
55:58
and events where events are messages between us and the agent outside of that
56:03
sessions have a few additional pieces of information sessions have ids app names
56:09
user ID and last update time so let's talk about what each one of these is at a high level really quickly so as you
56:15
begin to build larger agent workflows you eventually we want to be able to
56:21
look up sessions so you'll want to say "Oh for user Bob I want to see all the different conversations he's had between
56:28
him and the agents that we've created." And in order to look that up what we'd want to do is go "Oh okay i'm working in
56:35
this app and I'm trying to look up the conversation that user Bob had with it
56:40
oh okay by looking up that information I can see Bob was in session 123 so now I
56:46
can easily pull out that session and allow Bob to continue to chat with that session so think of think of sessions
56:53
really as just a stateful chat history that is the best way to think of sessions okay so that's sessions at a
56:59
high level now to uh add in a little bit of complexity there are multiple types of sessions so there is in-memory
57:06
session which is where we are saving all the conversation histories that we're having with each one of our agents and
57:13
we're saving in memory which means as soon as we close out of the application everything in memory is gone and we lose
57:20
access to all the conversations that we had the next option is to do a database session and we're going to do database
57:25
session in example six the example right after this but basically every time we have a conversation with our agent we're
57:31
going to store it to a database which is nice because when we close out of the application all the information is still saved and when we reload the application
57:39
it'll go "Oh great i can pull out all the existing conversations between Bob all the our other users I can pull them
57:45
out." And that way whenever they want to continue the conversation they can then what the third option you can do is to
57:51
save these sessions to Vertex AI vertex AI is Google Cloud's AI platform it is
57:58
amazing i actually have an entire tutorial teaching you how to deploy your agents to App Engine on Vert.Ex AI but
58:05
just know if you want to store your sessions in the cloud and not on your local computer Vert.Ex AI is the easiest
58:10
way to do it it's out of the scope for this tutorial and but I just want you to know you have multiple options save it
58:16
in memory to where it goes away save it to a database to where you get to keep it on your local computer or option three save it to the cloud with Vert.Ex
58:22
AI okay great so we've seen sessions at a high level i want to show you what a
58:27
code snippet looks like of creating a session so as we decided just a second ago you have to pick where do you want
58:34
to save your sessions so we are going to import our sessions and use the in-memory one cuz we're not trying to
58:39
connect it to anywhere fancy right now so we're going to say all right I would like a in-memory session and then what
58:45
we can do from there is go I would like to create a session because I want to be able in this case my example user to be
58:53
able to begin talking with my agents and then you can pass in some additional information like the app name it is
58:59
required but just know you know we're we're not really building apps right now we're just mostly focused on talking with our agents so yeah just know you
59:06
have to give an app name you have to give it a user ID and then from there the other option you have is to give
59:12
state state is optional but this is where you can pass in all sorts of user preferences or whatever agentic workflow
59:18
you're building it's usually helpful to build pass in state to allow the agent to have some additional context instead
59:24
of just the instructions we give it okay then once you create a session what you
59:29
can see is when you log what's in the example session you can see it has all of the different properties that we
59:35
called out right here so we have an ID the application name the user ID state
59:41
we have events which were nothing more than the events between us and the agent specifically the messages tool calls and
59:48
agent responses that's what you're going to see inside the event list and then finally every time we make a request it
59:54
also updates the last update time so you can just see like oh yeah we've been using this agent super recently or no we
1:00:00
haven't touched this agent in a week okay great so that's session at a high level and just the core takeaway from
1:00:05
this is sessions are just stateful message histories that's the core thing to take away from this okay great so now
1:00:12
we're going to hop over to well now that I know what a session is how do we actually like get agents to run like
1:00:18
there's a lot of moving parts how do they all connect well everything connects inside of a runner and a runner
1:00:25
is I'm going to walk you through what you need to provide to a runner first and then we're going to go through an example life cycle so a runner is
1:00:32
nothing more than a collection of two pieces of information your agents and
1:00:37
your sessions so let's walk through why we have to put this in an agent or inside of a runner so inside of a runner
1:00:44
we need to give it agents so that the runner knows every time it gets a request well what agents do I have
1:00:50
available to take and handle this request for example if we were working with a frequently asked question agent
1:00:57
well we would see oh okay I have a a question and answer agent so every time
1:01:02
I get a request I know I can give it to that agent to to be the starting point to handle answering the question also we
1:01:09
need to have a session because as we just discussed a second ago we need to have somewhere to store our message
1:01:14
history and our state so these are the core components that you need in order to create a runner so let's walk through
1:01:21
a quick example of how us chatting with the runner actually works step by step
1:01:27
so let's say going back to our frequently asked question agent let's walk through it so let's say our user
1:01:32
says "Hey what is my name?" Or we can say "Hey what is the return policy for
1:01:39
this business?" We'll go with that example well first thing that it's going to do is the runner is going to go "Okay
1:01:44
you are user Brandon and I can see you are asking this question." So first
1:01:49
thing I'm going to do is look through our session i can see you have a user ID of 1 2 3 so I'm going to look through
1:01:56
all the sessions I have available and I'm going to see okay I see you have a message history and you are currently
1:02:02
have this state great from there it's going to pass over all the context it
1:02:07
provides and finds to an agent and this FAQ agent is going to go okay I can see
1:02:13
user Brandon likes these things he's purchased these products from us and now that I'm working with the frequently
1:02:19
asked question agent I can now begin to generate a response and this agent is going to go okay in my workflow I am a
1:02:27
single agent i don't have five sub agents something we'll talk later about more later on but I can see that I have
1:02:33
one agent so I am now trying to figure out which agent is going to handle this response and since there is only one
1:02:39
agent in here I'm going to pass the query you gave me plus all the session information I have about you to the
1:02:46
agent who's responsible for handling this request in this case there's only one agent so that's the agent that gets
1:02:51
picked from there that agent makes a few extra calls if we have tools provided to
1:02:57
the agent the agent will go off and maybe search the internet it might go off and search our database whatever we
1:03:02
need to do it will make the necessary tool calls and then from there it'll pass in an a request over to our large
1:03:09
language model so Gemini so it's going to pass the results from the tool call into the large language model and go "Oh
1:03:15
okay i can see you were trying to make a request about our return policy i can
1:03:20
see you've ordered this product yep i looked it up it looks great it looks like you can return that item within 30
1:03:27
days and it's only been 20 so you can return that item." From there what'll
1:03:32
happen is on the way back to the user we will update our session by adding in new
1:03:38
events because if you remember from above sessions have two pieces of information they have state and they
1:03:44
have events and these events can also include the agent response so we're going to add in the agent response where
1:03:51
we're going to say "Yep you can return the item you're talking about." So that's us updating session and then
1:03:57
finally the runner is going to spit back the result to the user and say "Yep looks good you can return the item
1:04:04
everything's happy." So this is the core loop in a nutshell of working with basically all the core concepts we just
1:04:11
talked about which are going to be runners sessions and state so hopefully
1:04:16
that makes sense the core lesson here is sessions just one more time sessions are stateful message histories and runner is
1:04:22
nothing more than just a combination of all the raw ingredients needed to generate responses for our users and
1:04:29
when I say raw ingredients just a list of our agents and the current session we're working with it combines them
1:04:35
together to help generate intelligent responses so hopefully that all makes sense and don't worry we're going to
1:04:41
dive into a code example next so you can see all of these different core components working together so you can
1:04:46
see them in action so let's go ahead and hop over to the code so you can see everything running so now it's time to
1:04:51
look at the code when it comes to combining all of our session state and runners into one area so we can begin to
1:04:57
chat with our agents and the core takeaway that I want you to have inside of this code example is we are having to
1:05:03
build all the core functionality that ADK web command normally handles for us
1:05:08
we're having to build it here and this is super important as you want to go off and create more complex agents where you
1:05:15
don't want to just chat with them inside ADK web let's say you want to start incorporating agents inside of your
1:05:21
applications this is how you would go about doing it where you would yourself manage the memory the sessions and the
1:05:28
runners this is what you would be responsible for doing in your own applications so let's go through this part by part where I'm going to explain
1:05:34
everything that's happening so you can you know hopefully master everything as well okay so what are we doing first
1:05:39
well first thing we're going to do is we are going to load our environment variables the reason why is inside of
1:05:46
all of our other projects we would keep our environment variables with our agents but now that we're managing
1:05:53
everything ourselves we need to keep our environment variables at the root level of our folder because we're not running
1:05:59
ADK web which is going to handle and pull out all the environment variables inside of our agents the environment variables now need to leave live at the
1:06:06
top level of our folders and per usual our environment variables just have our API key and everything else that we need
1:06:12
to make requests okay great so now let's start looking at some of the core concepts that we are trying to do here
1:06:18
so the first thing that we decided is we need to pick which memory service we're going to use we can do database inmemory
1:06:26
or vertex AI we just want to run everything locally for this example so you can get a you know a quick overview
1:06:32
of seeing this in action so we're going to create an in-memory service where the second we close the application all of
1:06:38
our sessions disappear okay the next thing that we are going to do is we are
1:06:43
going to create initial state as I said earlier initial state is nothing more than a dictionary so you can see we are
1:06:50
creating a dictionary right here and we are giving it two keys we are giving it a username and user preferences these
1:06:57
are the two different keys we are passing in our dictionary so we can ideally in this frequently asked
1:07:03
question agent called Brandonbot what we can do is answer questions about Brandon
1:07:08
that's what we're trying to do here so that's why we want to pass in initial state great so now we are going to
1:07:14
create a session and if you remember what you have to do is inside of whatever memory service you pick you can
1:07:21
then say I'd like to create a session using this service this session service so in our case we need to create a
1:07:27
session and pass in all the values necessary in order to create it you saw this just a second ago when we were
1:07:32
looking at the Google example but you can see we need to pass in the app name in our case Brandonbot from there we
1:07:39
need to come up with a user ID we're just going to call it Brandon Hancock and then we need to pass in a session ID
1:07:45
and we're just going to do this right here which is called a universal uniquely identifiable key basically
1:07:52
which is just it's just going to make a super long random character that you know are very unique and then finally
1:07:59
what we're going to do in our session is we are going to provide initial state so that's everything you need to do to
1:08:04
create a session awesome so now that we've created our session what we're trying to do is if you remember when it
1:08:10
comes to raw ingredients to making a runner there was two for a runner we need to have in our case we need to have
1:08:17
our agent and then we need to have our session so we just created our session check and the next thing we need to do
1:08:24
is pass in our agents so where the heck do our agents live well in our case
1:08:29
we've created a folder where our questionans answering agent lives so you
1:08:34
can see it's all in the same folder and if you open up your questionans answering agent folder you can see it
1:08:40
looks just like the rest of them and if you open up agent.py Pi you can see hey you are a helpful assistant and the job
1:08:47
of you as a helpful assistant is just to answer questions about the user's preferences and this is where we're starting to get a little fancy because
1:08:54
in order for you to access state you can use begin to use it's called string
1:08:59
interpolation which is really just a fancy word for putting the key you want inside of brackets so going back let's
1:09:06
do a side by side so you can see it so inside of our basic session right here
1:09:12
you can see in our initial state we had items such as our basically our username
1:09:18
and you can see that right here we can access our username so this is how you access state inside of your agents you
1:09:26
just pass in the key that you want from over here and you can pass it in here so that is how you can access state inside
1:09:33
of your agents super helpful and you're going to do it a ton as you work more and more with your agents okay great so
1:09:38
now that we understand what the agent can do let's hop back over to our runner
1:09:43
because our runner was responsible for taking in our agent that I just showed you and responsible for taking in our
1:09:50
session service because once it has those two core pieces of information we can now begin to ask questions and send
1:09:56
in messages to our runner now in order to create a message the raw way to do it
1:10:01
inside of ADK is to create a message that looks just like this where you say
1:10:06
hey I would like to make a message and the way you do that is through there's a library called types so from Google's
1:10:13
generative AI library that you have installed inside of whenever we created our Python environment what we did is uh
1:10:21
we imported generative AI from Google now what we can do is create a new piece of content which is basically just a
1:10:26
message is the best way I like to think of it and with a content you want to pass in two pieces of information the
1:10:31
role so the role is going to be either the user or the agent so who's responsible for sending this message
1:10:38
role or user and then from there you have parts think of parts just as the raw piece of text that you want to pass
1:10:44
over to the agent as your query in this case we're going to say "Hey what is Brandon's favorite TV show?" This is the
1:10:50
message we want to send to the agent so what we can do is go all right now that I have everything set up and ready to
1:10:57
run I can say all right runner I would like you to run everything that I've given you so far for the user ID and the
1:11:06
session ID and I would like you to process this new message from there the
1:11:11
runner is going to go off and process everything that we just talked about in
1:11:16
the life cycle earlier where it's going to look at the agents it has available it's going to pull information from state by looking through our sessions
1:11:23
pass all that information over to the relevant agent there's only one this time so it's just going to pass all that context to that one agent that agent is
1:11:30
then going to say "Hey do I have any tools I can call?" Nope I don't so all I'm going to do is pass all this
1:11:36
information over to the Gemini LLM and the reason I say Gemini LLM is because
1:11:41
that's the only LLM that we have attached to this agent from there it's going to generate a response and that
1:11:48
response is going to get saved as an event to our session so that's why we are going to look through our session
1:11:55
and say is this the final response from this run if it is what I would like you to do is please show me the content from
1:12:03
this final event so I can log it so I can see it and if you remember earlier
1:12:08
every event that's what we're looking at an event has content that's why this is like type.content so we're just
1:12:14
basically in short in summary just looking for the message that was responded and sent back by the agent so
1:12:21
that was a lot of talking what I would like to do is run this for you guys so you can see it in action so let's go
1:12:27
ahead and run this so let's clean things up and a few things first off we need to make sure that you are in example number
1:12:33
five and you do have your current Python environment activated and what you can do now is run Python and then run basic
1:12:41
stateful session and if you remember what this is trying to do is it's going to answer the question what is Brandon's
1:12:46
favorite TV show and then we are going to log two pieces of information we are going to first log the final response
1:12:54
then we are going to grab the current session and we are going to show the session state that's what we're trying
1:13:00
to do in this quick example so you can see everything working together so it takes a second to run and you can see
1:13:06
great we created a new session with a unique session ID and you can see it
1:13:11
answered the question super easily because it looked through the state we passed in so you can see oh yeah Brandon's favorite TV show is Game of
1:13:18
Thrones currently re-watching it as we speak from there what you can see is we're doing a session event exploration
1:13:24
where we're just trying to look at the final state and once again you can see this initial state that we passed in you
1:13:30
can see that we have access to all of it right here and this is how it was able to answer the question of what is
1:13:35
Brandon's favorite TV show so yeah that is sessions state and runners in a
1:13:41
nutshell this was definitely a little bit more codeheavy than running ADK web but these are the core components you
1:13:49
need to run your agents especially if you want to start adding them over to your applications and you know in order
1:13:55
to run your agents so what we're going to look at next is we're going to head over to example six so you can see how
1:14:00
we can connect up our sessions to a database so it doesn't matter when we close out of the application when we
1:14:06
reopen it we're going to have access to all of our sessions let's go over to example number six hey guys and welcome
1:14:12
to example number six where you're going to learn how to store your sessions and state to a local database so that when
 Example 6: Persistent Storage
1:14:19
you close out of your application and reopen it it's going to be able to pull in all that existing information and
1:14:25
you're going to be able to pick up the conversation right where you left it off and in this example we're going to break it down into two parts first we're going
1:14:32
to review the entire code part by part so you can understand exactly how we can pull out existing sessions how we can
1:14:38
save sessions to a database we're going to cover everything step by step and then part two we're going to run the
1:14:44
example so you can see everything in action and this is by far one of my favorite examples in the whole crash
1:14:50
course because this is where everything should click and you go "Oh I now understand how everything works
1:14:55
together." And as a quick note if you haven't watched the beginning of example number five where I break down the core
1:15:01
components of sessions state and runners definitely recommend checking that out again before watching this one but
1:15:07
without further ado let's go ahead and hop over to the code so now it's time to look at the code for how we can start to
1:15:13
save our sessions to a database so when we close out of an application and restart it we can still access all of
1:15:19
our previous messages okay so let's walk through the five different highle parts of this code so that we can be on the
1:15:25
same page so first things first our whole goal is we want to begin to save sessions to a database so what we need
1:15:32
to do is we need to say hey I would like to save all my sessions to a specific
1:15:38
database file in this case we're saying I would like to save it to a SQLite file
1:15:43
which is basically just a SQL database that's just super easy to work with and I want the file to be called my agent
1:15:50
data database now you can see over here in our folder structure I already have
1:15:55
an existing database so you can see whenever we run this code in just a little bit it's going to create a
1:16:01
database file just like this inside of example number six so that's what it's going to do now we can say all right
1:16:07
when it comes to which sessions I would like to use well if you remember in the last example we were using the inmemory
1:16:14
session service well this time we're using the database session service and quick pro tip you can save these
1:16:20
sessions locally like these database sessions locally or if you have a database running in the cloud somewhere
1:16:27
hosted like on Google Cloud Platform or another database hosting services you could point it there as well but for
1:16:33
this example we're just saving everything locally all right next what we want to do is define some initial
1:16:38
state because what we are trying to do in this example is to create a reminder agent who will take in reminders from us
1:16:45
save these reminders to a list and then when we are done with those reminders it should remove the reminders from our
1:16:51
list that's exactly what we're trying to build inside this agentic workflow so we need to update our initial state to say
1:16:57
our name and start off with a blank empty list of reminders from there what we're trying to do is begin the process
1:17:05
of working with existing sessions and creating new ones so imagine if we start
1:17:10
creating a new conversation with our agents and it's the first time we're working with them it should create a new
1:17:16
session if it is the you know we've been talking to this agent over and over and over we should pull out our existing
1:17:22
session so let me show you how we're doing this well first things first we need to give our app an application and
1:17:28
pass in a user ID so we need to have these and then with inside of our session service which is going to be our
1:17:34
database session service that stored all of our previous conversations in this file we're going to run the command list
1:17:41
sessions and what this will do is it will look up for this specific application and this specific user it
1:17:48
will look up all existing sessions that we've already had with this agent from there we're going to do a quick check so
1:17:55
in option number one we're going to say hey did this existing session already exist and does it have a length over
1:18:02
zero meaning like there's there is a session because obviously if there if it exists the number will be one and
1:18:08
greater than zero and if that's the case what we're going to do is pull out the session ID from that existing session so
1:18:15
that's how we're going to get our session ID if this is the first time we've began to chat with this session
1:18:21
what we want to do instead of using the existing one is we want to create a new session and if that's the case what we
1:18:28
want to do is pass in the app name the user ID and initial state so either way we're going to be in a great situation
1:18:34
where we have a session ID that we can begin to communicate with great so now that we have that session ID what we can
1:18:41
do is begin to start to set up our runner just like we did in example number five and if you remember the core
1:18:47
ingredients of a runner was our agent who's going to be responsible for handling all the requests and has all
1:18:52
the instructions and tools and agents everything inside of it so we want to pass in the root agent and we also need
1:18:58
to pass in the specific session service that we've been working with so in our case remember the session service is
1:19:04
nothing more than the initial database session service that we set up from the get- go okay great so now that we have
1:19:11
our runner set up we are set up to start a interactive conversation loop and this
1:19:17
is where we are going to go through the following where we are going to work with a memory agent chat that will
1:19:22
remember reminders for us and whenever we're done chatting with it we can type in exit or quit and it will kill the
1:19:28
conversation for us so what I would like to do is do a quick run through of this and actually run the agent so you can
1:19:35
see in action and two things I want to do before running it is I want to go clean things up so I want to delete our
1:19:42
database so that we're running from a clean slate so we're deleting the database and then I want to show you how
1:19:48
we're handling each request so each user input that we get when we're chatting with it I want to show you how we handle
1:19:54
it and that's all inside of the call agent async function i put this in a separate file called
1:19:59
utils.py so you'll notice in the example 6 folder I have a utils.py file for you
1:20:05
and this has a few different functions to help make your life simpler and we as good programmers want to keep our code
1:20:12
clean in our main file so let's walk through this really quickly so you can understand what's going on so first things first we're passing in a few
1:20:19
different pieces of information we're passing in the runner that has access to our sessions and it has access to our
1:20:26
agent from there we want to pass in the user ID so who's making the request in which session are we working with and
1:20:32
then finally we want to pass in the raw query which is like oh what did Brandon ask from there we need to convert the
1:20:39
query we get into a piece of content and if you remember from example five a content is nothing more than just a
1:20:45
message we want to send over to our agent from there what we're going to do is log it and I have set up a bunch of
1:20:54
print statements to make our lives a lot easier so we can inspect what's going on you'll see this in just a second when we
1:20:59
run it but the core thing that you'll notice is once again we are going to for that runner we're going to call run last
1:21:05
time we did runner.run and this time we're going to do runner.async google ADK recommends to always use runner
1:21:12
async and to only use runner.run when you're testing locally so if you're doing any real world
1:21:18
application always use run async now once we have that set up for our runner we pass in all the information that
1:21:24
we've been working with so who's making the call what are the previous messages that we have been using and talking
1:21:30
about with this specific user and between them and the agent and then finally what is the new message that you
1:21:35
want me to work on from there the runner is going to go through that life cycle that we talked about last time and we
1:21:41
are going to process the agent response so let me show you what that looks like and basically what we're going to do is
1:21:47
iterate through all the different pieces of content that we get and what the main
1:21:52
thing that you want to care about is we're going to log the final response so if it is the final response we're going
1:21:59
to log it and so you can see oh yeah this is what the agent said don't worry it doesn't matter a lot of this complex
1:22:06
code is all around just printing statements so you don't really need to to worry about a lot of it okay great so
1:22:11
once we process the agent response and we have it we log the final response text right here so we just return the
1:22:18
final response so that's it in a nutshell i know that was a little bit more complicated but don't worry i'm going to run it and it will all make
1:22:23
sense so let's clear everything out and run the agent so you can see it all in
1:22:28
action and we're going to do two different runs the first run we're going to start out with a blank database where
1:22:34
it doesn't exist so we're going to have ADK create the database file for us then we're going to ask a question or two
1:22:40
create a reminders and then we're going to close out of the application and restart it so you can see everything in action so let's start the fun so we are
1:22:47
going to inside of file 6 with our virtual environment activated we are going to run python main.py and this
1:22:54
will allow us to uh it'll spin everything up in just a second we should see it created a database file for us
1:23:01
from there we can now start to add reminders and I'm going to make this really big so you can see what's going
1:23:08
on so we're going to say "Hey please set a reminder for me to take out the trash
1:23:17
tomorrow at 5:00 p.m." From there the agent is going to take in that request
1:23:24
and from there the agent is going to respond "I've added your reminder to take out the trash tomorrow at 5:00 p.m." And yeah so that's what it's
1:23:31
saying and now as an extra bonus for you guys I log the state before and after
1:23:37
every request so you can see the state before processing this message was none we had zero reminders but afterwards the
1:23:45
agent created a new reminder for us now how the heck did it do this how did this
1:23:50
agent save a reminder well we didn't fully show this off initially but if you
1:23:56
go to your agent.py pi file you can see we created I'm going to minimize these so you can see in action one second so
1:24:03
what you can see is we now have a new memory agent this memory agent takes in
1:24:09
a few core pieces of information it has a description and it has instructions and when it comes to instructions we say
1:24:15
"Hey you're a friendly reminder assistant you are working with this shared state information specifically
1:24:21
you have access to the person's username and a list of reminders from there what I want you to do is you have the
1:24:27
following capabilities you can add new reminders view existing update them delete them or update the user's
1:24:32
username from there I give it some extra specific instructions telling it how it should handle the process the basic CRUD
1:24:39
which stands for create read update and delete i walk it through the basic operations for creating and working with
1:24:45
updating our our different reminders now how do we actually update state and our
1:24:51
reminders well the way we do that is through our tools so we have added
1:24:56
multiple tools to this agent so everything from adding viewing updating deleting and the basic CRUD operations
1:25:04
so that's why we have all these tools up here now later on when we get to tool context management we'll work on this
1:25:10
more but the main thing I want you to know is when you are working with state inside of your tool calls which we'll
1:25:17
touch on a lot more when we get to callbacks what you'll notice is there is this new tool context parameter that we
1:25:23
give to tools now what the heck does this mean well basically what's going on is you can pass in whatever parameters
1:25:29
you want that you would normally give to a tool and then at the very very end you can pass in tool context and tool
1:25:35
context will have access to all sorts of different attributes and specifically it's going to have access to the state
1:25:43
so it has access to all sorts of information so what we're doing is we're going hey tool context I would like you
1:25:50
to give me access to the current state object and I would like you to get all the current reminders once I have access
1:25:56
to the reminders I would like you to add a new reminder to the list once I have that new reminder I want to save it back
1:26:04
to state so this is how you add information to state you just call state
1:26:09
have the key and then pass in the new value and then from there what we're doing with our tool call cuz earlier in
1:26:14
our example number two when we learned about tools you learned that you want to make sure your tool return statements
1:26:20
are as informative as possible so in our case we're returning the fact the action
1:26:25
we're passing back the reminder and we're passing back a message saying "Hey I successfully added this reminder." And
1:26:31
this is the exact same flow we follow for all of our different tool calls so when it comes to viewing our reminders
1:26:37
all we need to do is inside a tool context we just need to access the tool
1:26:43
state we want to get reminders and then return them and it's the exact same thing for all the rest of the different
1:26:49
tools we just pass in some variables pass in the tool context pull out what we need and then save it back to state
1:26:56
so that's exactly what's going on so we've kind of gone a little bit in the weeds but what I want to do is add in
1:27:01
one more reminder then we're going to close out of the application rerun it so you can see that yes it is properly
1:27:07
saving things to our database so let's also say also remind me to mow the grass
1:27:15
this weekend from there it's going to update and add a new reminder using those tools that you just saw so life's
1:27:22
good so what we're going to do now is we are going to kill the application so you can do that just by typing quit this
1:27:28
will end the conversation life's good your data has already been saved to the database we didn't have to do anything
1:27:33
extra adk new by providing that initial sorry let me minimize this for you guys
1:27:39
adk new by providing in that initial database service it would automatically
1:27:44
save everything to the database so let's have some fun and see what was saved to our database so when you click in the
1:27:50
database if you're using cursor you should be able to see a database viewer just like this and what you can see is
1:27:56
it saved all sorts of information to session it saved app state raw events
1:28:02
sessions and user state so if I open up sessions and double click on it you can
1:28:07
see that we have a session state between the user AI with Brandon we have a session ID and you can see the state of
1:28:15
where we left off and if you look in the state right now you can see it includes everything that we just added a second
1:28:21
ago so my username and the list of reminders which are take out the trash and mow the grass so you can see it's
1:28:27
all being saved to a database now and if you want as well you can click inside of events and you can see all of the raw
1:28:34
events that happened inside of your application as you get larger applications it wouldn't just show for a
1:28:40
specific user it would show for all users so this is a really nice way to see what's happening inside of your agentic workflows and like we talked
1:28:47
about earlier there are two different types of messages and in this case there are you know agent messages and then
1:28:54
user messages if we and we should also probably start to see some tool calls yep just like this so you can see some
1:29:00
messages like a user request from me which is hey please do this you can see that it involves a function call which
1:29:08
is hey please go save if we just click in it you can see it's calling doing a
1:29:13
function call to the add reminder function and from there it's passing in
1:29:18
the raw text of what the tool needs to do from there you can see the function
1:29:24
response included the exact response that we wanted so the function response now includes that message we said that
1:29:31
was very verbose which included the raw action it included the renew reminder and a message about the action that just
1:29:38
occurred so you can see this is all getting saved to a database all around absolutely love it so what we're going
1:29:44
to do next is let's close out of our database we're going to clear things out and rerun the same command so now when
1:29:51
we begin to talk with our memory agent again I can say hey what are my current
1:29:58
reminders from there it's going to access our state per usual and it's
1:30:03
going to say all right Brandon here are your current reminders and at this point it's showing the reminders we already
1:30:09
had saved to our session and which our session was saved to a database so all around I hope you guys are like freaking
1:30:15
out and saying like "Oh my gosh I now understand how everything works when it comes to session i understand what
1:30:21
runners do i understand how sessions can be saved to memory or to a database and kind of see how it all clicks together."
1:30:26
I know we did talk on a few additional topics like I didn't really mean to talk about tool context but hopefully it was
1:30:32
helpful to see how tools can access state so you could see how we were altering the state as we were starting
1:30:38
to make tool calls with our agents so I know that was a little bit of a side quest but hopefully it was super helpful to see and don't worry as we begin to
1:30:44
work with callbacks you're going to see a lot more on that okay great well give yourself a pat on the back we are
1:30:50
halfway done with you mastering ADK and now we're going to move on to our next example so I'll see you guys in the next
1:30:56
one hey guys and welcome to example number seven where we're going to look at our first multi- aent system so
 Example 7: Multi-Agent
1:31:02
excited for this one and what we're going to do is break this up into three different parts first we're going to
1:31:07
head over to the whiteboard so you can understand how multi- aent systems work inside of ADK because it's completely
1:31:13
different from what you would expect to see in Crew AI or Langchain from there once we understand how things work we're
1:31:19
going to look at a simple code example of our first multi- aent system and then finally in part three we're going to run
1:31:24
it so you can see everything in action so let's go ahead and head over to the whiteboard so we can break down some of the core patterns and behaviors of
1:31:31
multi- aent and ADK all right so let's start investigating how the heck do multi- aent systems work inside of ADK
1:31:39
now what I want to do in this first example is give you a brief overview of an example agent so let's imagine we
1:31:47
have a root agent because you always have to have a root agent inside of your ADK setups this root agent is usually
1:31:55
considered the delegator or the manager or usually this agent is responsible for delegating work to other agents that's
1:32:02
usually the entry point to everything inside of your application now here is where ADK is different than other
1:32:08
frameworks compared to like Crew AI and link chain what happens inside of ADK is
1:32:14
whenever you send a request into the framework and specifically to your agent
1:32:20
what this agent is looking to do is answer the query as quickly as possible so let me give you an example and then
1:32:26
walk you through why it's different than other solutions so if you pass in a query such as hey what is the weather
1:32:32
today this agent is going to look at the description of all of its sub agents and
1:32:39
figure out which one is the best suited to answer the query once it knows who to
1:32:45
pass the work to the root agent is out of the picture it delegates all the responsibilities to this sub agent who
1:32:52
takes control and handles it from there from there this weather agent then determines based on the query well it
1:32:59
determines well what tool calls should I make in order to answer the question so
1:33:04
then it goes oh it looks like you want to know the weather today well I will look up the weather in Atlanta Georgia
1:33:10
from there once it gets the answer the weather agent will then know okay I know the results from the tool call i can now
1:33:16
generate a result and the weather agent will return the final response now this is totally different than other
1:33:22
frameworks like Crew AI because in Crew AI what normally happens is you have one
1:33:27
task and then for that task you usually have multiple agents trying to work on
1:33:33
it so in crew AI you would expect to see something like this where you have get weather and what you would expect to see
1:33:40
is you would have multiple agents working on it so you'd have a weather agent you would have a research agent
1:33:47
and then you would have someone else and together these agents would work together to answer the question and
1:33:54
collaborate to answer it that is not the case in ADK it is all about delegation
1:34:00
and single answers there is no at least not yet we haven't worked on workflows
1:34:06
but at at a basic example of working with agents it is all about delegating and immediately answering the question
1:34:11
this was something that confused me a ton when I started out with ADK and I just wanted to make sure you guys
1:34:17
understand this core principle so key takeaways we focus on delegation inside ADK and whoever is the best suited to
1:34:24
answer the question they get to work on it and they get to generate the result there's no multi-iterating over and over
1:34:31
and over at the basic examples of ADK we'll get to workflows later on but just know at a basic level there's no no
1:34:36
looping multiple attempts whenever you set up your basic multi-agent systems they just answer the question as quickly
1:34:42
as they can to get you an answer okay cool now we need to look at some of the core limitations of working with ADK so
1:34:49
whenever you create agents sometimes you want to use all the cool new built-in
1:34:55
tools that ADK creates for you however when you look at the documentation for
1:35:00
working with these agents it specifically says that hey you cannot use built-in tools within a sub agent
1:35:07
this tripped me up because I was like why doesn't this work why doesn't this work well don't worry it is because you
1:35:12
cannot use built-in tools with sub agents so for example this would break if you had a root agent who was just a
1:35:20
general researcher agent who was responsible for delegating out to uh sorry it was a manager agent who's
1:35:26
responsible for delegating out work if you had a random request of like hey what's going on in the news today well
1:35:32
this would fall under the search agent and this search agent would try to call the built-in Google search tool this
1:35:38
would break you're going to get a huge error saying you can't do this and it's not the most clear error and you it's up
1:35:44
to you to know that this limitation exists now there is a workaround to get
1:35:49
this to work and let me steal the ball over here and walk you through it so there is a workaround if you did want to
1:35:55
look up a generic search request of like hey what is going on in the news today what you can do is use the command agent
1:36:04
as tool and what this will do is it will treat your agents as a tool call so this
1:36:09
is the only way to work around it to use if you wanted to use tools like Google search in a sub agent you have to use
1:36:16
this agent as tool don't worry you're going to see this in the code in just just a second but just know whenever you do this setup what happens is the root
1:36:22
agent goes "Oh okay well what I'll do because I want to look up the weather is
1:36:28
I will or look up what's happening in the news i will call this pathway like a
1:36:34
normal tool where I pass in parameters and everything else to get an answer and then this will work but this is just a
1:36:40
weird workaround if you want to use any built-in tools like Google search if you want to use the vector search AI or the
1:36:45
code execution tool built in from Google this is the path you have to do now I did mention a while ago that hey there
1:36:52
are a few different workarounds so if you don't want the behavior of the agents you know just doing a single shot
1:36:58
where they're delegating the work to let the other agents handle all the requests what you can do is work with these
1:37:05
different types of workflow agents that we're going to cover in examples 10 11 and 12 where we focus on parallel i got
1:37:12
to spell correctly for this to work parallel agents sequential agents and loop agents this is where we can start
1:37:18
to have agents take multiple attempts at solving answer and don't worry we're going to look at these at the very end
1:37:23
so I just want to clear up a few different things because multi- aent systems in ADK are different than anything else you've ever seen but I
1:37:29
want to go ahead and walk you through the core lessons which were everything gets delegated you cannot use built-in
1:37:35
tools and sub aents if you do want to you need to use the agent as tool
1:37:41
wrapper all right now you've seen all the highlevel lessons let's dive into the code so you can see everything in
1:37:46
action see you in just a second okay so now it's time for us to look at the code for our first multi- aent system we're
1:37:53
getting advanced guys we've gone from a single to multiple so here is a brief overview before we dive in of everything
1:38:00
that's going on so first things first we are creating a new agent just like we have this whole time the name needs to
1:38:06
match our folder name because we are right now in example number seven from there we're going to give it a model just like we normally do and then we are
1:38:14
going to give our agent instructions so we're going to say hey you are a manager agent just to be very clear that your
1:38:21
job is to delegate and you always want to delegate the task to the appropriate
1:38:26
agent here are the different basically task you are allowed to delegate to other agents so we're saying you have
1:38:33
two agents the stock analysis agent and then a funny nerd agent who tells this
1:38:38
joke and then to help give you guys some additional examples we're also providing this manager agent some tools so if
1:38:44
these agents can't handle it we're going to pass it along to these tools now here
1:38:50
are the big changes that you're going to notice inside of multi-agent solutions
1:38:55
so the first one is we now have a sub agent property which is a list and we
1:39:00
can pass in additional agents in here and as you remember from the whiteboard
1:39:05
session anytime we answer a question if one of these agents is fit best to do
1:39:10
the task we pass the task over to these agents and they handle managing the response and doing all the work now how
1:39:17
do we actually get these agents inside of our main root agent well super easy what we do is we import these agents
1:39:25
from our sub agent folder so inside our sub aent folder this is where we have
1:39:30
pretty much everything that you would expect to see we have our funny nerd and we have our stock analyst and we have
1:39:36
our news analyst more on the news analyst in a second when we start to talk about agent tools but what you'll
1:39:42
notice is inside of each of these sub agents it's the exact same folder structure that you've seen for
1:39:47
everything so far where you have a folder in the folder you have an agent that agent needs to have a name that
1:39:54
matches the name here so rinse and repeat same thing you guys have been doing this whole time now what we can do
1:40:00
is look at how do you import these well up top in the root of your root agent
1:40:06
folder you'll just import from the sub agent folder call out the package right here so this is the funny nerd package
1:40:13
and we want to grab the agent folder once we grab the the agent file sorry what we want to do is inside the agent
1:40:19
file we want to import the funny nerd agent so that's exactly why these
1:40:24
imports look just like they do okay now what we're going to do just so we're on the same page I'm going to give you a
1:40:30
brief overview of each one of these agents and then we're going to dive into the tools so you can see how this agent
1:40:36
as tool functionality works as well so let's first go look at our stock agent super straightforward agent the
1:40:42
important thing to note here is when it comes to multi- aent systems in order for the root agent to know what each of
1:40:50
its sub agents can do is it looks at the description this description decides and
1:40:56
tells the parent agent hey here's what I can do and here's how I can help so if anyone asks a question around looking up
1:41:02
stock prices or looking at them over time I can do that that is my core functionality and I can help with it and
1:41:08
then this agent is has a singular function where all it does is it gets a
1:41:13
stock price for a current ticker so it just gets the yeah gets current stock price the other agent that we have is
1:41:19
our funny nerd our funny nerd once again same model same name as the parent and
1:41:24
what it does is it says this agent tells funny nerdy jokes so anytime we want a
1:41:30
joke this model will get picked and from there the final thing that we're going to do is now that you've seen these
1:41:36
agents in action let's quickly look at our news agent because this agent does
1:41:42
it breaks one of our rules because this agent imports one of the built-in tools from ADK and because this agent imports
1:41:50
Google search we can no longer call this agent as a sub agent for example if we
1:41:56
did this this would break i'll show it to you that it does break in a little bit in case you do run into the same error but the important thing is we have
1:42:02
to wrap it as agent tool now why do we have to do this and what's the difference when we do this well if you head over to the core docs inside of
1:42:10
what agent development has and you look at the key differences of working with sub aents here's what's happening
1:42:16
whenever you do agent as a tool whenever the parent agent calls the child agent
1:42:21
as a tool basically what happens is the result from agent of the child agent
1:42:26
gets passed back to the parent agent and then the parent agent uses that answer
1:42:32
to generate a response so basically the child gets called this child agent which is agent A in this case does all the
1:42:39
work calls all its tools in our case the built-in tool and then it returns the answer back to the parent and then the
1:42:44
parent uses that to respond whereas with sub agents it does exactly like we said earlier which is when a parent agent
1:42:50
delegates to a sub agent the responsibility of answering is completely transferred to the child
1:42:55
agent where agent A is out of the loop going forward so that is going back to the key principle earlier of everything
1:43:01
gets delegated in multi- aent systems all right so now that you've kind of seen this in action what is this news
1:43:08
analyst or or sorry you already saw the news analyst and the way we use this news analyst to not break is we wrap it
1:43:14
inside of agent tool and you can import agent tool just like this so this is how
1:43:20
you do it google ADK tools agent tool and we want to put agent tool and that's how you wrap your agents to make them
1:43:25
tools pretty straightforward okay so now that you've seen this at a high level what I would like to do is start to run
1:43:32
the code and you're going to see how it works at a high level we're going to look at events state how it all gets
1:43:37
updated and then finally what we're going to do afterwards is I'm going to break the program where I'm going to not
1:43:43
wrap this inside agent tool just so you can see the type of errors you would get in case you ever accidentally make this mistake yourself so what are we going to
1:43:49
do we are going to make sure we first off are in the right folder multi- aent
1:43:55
and we've activated our virtual environment now we're going to run it once we run it it's going to spin up our
1:44:00
web interface that we've seen a thousand times that looks just like this and now what we can do is start to interface
1:44:06
with our agents so up in the top let's actually make this a little bit bigger for you guys so even a little bit bigger
1:44:13
great so what you'll notice is there's only one agent because our we only have one root agent so now what we can do is
1:44:19
say please tell me a funny joke and what we would expect to happen is the root
1:44:26
agent would transfer over to the joke agent and the joke agent would then
1:44:32
generate the response so here we can actually look at the series of events that triggered this so transfer to agent
1:44:39
we can start to see a little bit of an overview yeah it's just starting to get a little bit bigger so you what you can
1:44:44
see is the manager agent goes okay I have these different agents and tools at
1:44:50
my disposal now I've been asked to generate a funny joke so we are going to
1:44:55
now do it make a function call to pass over this query to the funny nerd and we
1:45:01
are going to transfer over to this agent so if we go over to the next event we should start to see that the yeah sorry
1:45:08
if we go over to the next event you should start to see that the funny nerd is now responsible for handling this
1:45:14
request and you can see that the funny nerd is like the code told it to do is
1:45:19
ask what it would like to to generate a joke around so if you per usual go and look at the what the code is it put
1:45:26
together the prompt and basically well I'm not going to go too deep into that that's too beginner for you guys but the
1:45:31
important thing now is you can say all right what would you like a joke about would you want to hear about Python JavaScript whatever you'd like so we'll
1:45:37
say we'll do a joke on Python and then now what we should see is we have quite a few more events so if we start to look
1:45:44
at them you can see now that we've asked to get a specific joke for a specific tool it's going to call the get nerd
1:45:51
joke for the topic Python and now it's going to return a nerdy joke around Python so yeah that's exactly what it
1:45:58
did okay cool well what other tools do we have access to so let's quickly look
1:46:03
really quick and see all right the other one we could do is stocks so tell me the current stock price of Microsoft because
1:46:12
it shot up today now what this is going to go do is
1:46:17
oh see so now we are still currently in the funny nerd joke so what we could do
1:46:23
is we would normally want to so now that we've been delegated from the root manager to the funny nerd we are now
1:46:30
stuck with the funny nerd so usually you can sometimes get delegated out of this so what we can do is mention the word
1:46:37
delegate so delegate gate to the root agent then
1:46:43
tell me the current stock price of Microsoft sometimes this will work yeah so if you're already in an agent that is
1:46:50
like a funny nerd it doesn't always do the best job of delegating so sometimes you have to mention hey you need to
1:46:56
refer me to another agent now what we can do is you can now see that we were transferred from the funny nerd back to
1:47:03
the manager and once we were in the manager we eventually get transferred over to the stock analyst so what you
1:47:10
can see now is the stock analyst called the proper tool and the tool returned the current price of Microsoft which is
1:47:17
as of today $424 this was a weird quirk this probably has happened to me one out
1:47:23
of 10 times normally if an agent is over its TED it just automatically does this
1:47:29
rerouting for you so that's probably something that we should have updated the prompt to say like hey if you get a
1:47:35
request that you are not comfortable answering delegate back to the parent so that was just a weak prompting on my
1:47:41
part now what we can do so you can just see a few other things let's just say what is the
1:47:48
news for today and what this should do is yeah so we need to say delegate again
1:47:54
so yeah I just should have improved the prompting to say if you can't handle the request delegate to the manager delegate
1:47:59
to the manager then tell me the news now this will per usual transfer transfer
1:48:06
and now we're going to go over to the news analyst the news analyst is going to use the Google search tool to find it
1:48:12
and then give me a summary of today okay great so you've now seen how we can start to work in multi- aent systems now
1:48:19
what I want to do is break things because that is fun so let's what we can do is get the news analyst out of here
1:48:26
we're going to move the news analyst here just so you can see what the error would be so if we respin up our server
1:48:33
what you'll notice now whenever I go to type into our editor so if I do I'll
1:48:39
just show you so I can say get the current time so I can show you it still works unless we call the the bad agent
1:48:45
so get the current time so this will get the current time call the tool everything looks great but if I now say
1:48:52
please look up the current news for today this will break and it'll say
1:48:59
"Oops this tool is being used with function calling that's unsupported." Which is a bad way of saying "Hey you're
1:49:07
being silly you're trying to call a tool that you're not allowed to so you're
1:49:12
trying to use an agent that is not that is supposed to be wrapped in agent as tool so I just wanted to show you guys
1:49:18
that because that when that broke the first time for me I was like what's going wrong so I just wanted you guys to see the error and then quick other thing
1:49:25
I did want to mention so you guys can see what I was talking about earlier what we should have said over in our
1:49:30
other prompts to say like if the user asks about anything else what you should
1:49:37
say is you should delegate get the task to the manager
1:49:44
agent so if we just run it again just to show you guys all this this is a little bit of live debugging so you get to see
1:49:49
behind the scenes a little bit so what happens now is we'll ask to get a funny joke and then we'll ask to get the news
1:49:55
just so you can see that it does delegate properly so we have to be hyper specific with these agents because they
1:50:01
don't they only act on what information we give them great so it's up and running again so now we can say tell me
1:50:07
a funny joke now this will go find a funny joke we've been transferred over
1:50:14
to the proper agent now which is going to be yeah the funny agent yeah so now we're talking with the funny nerd and
1:50:20
now we can say actually get me the current news for
1:50:26
today and then now it should delegate us properly over to the proper agent great
1:50:32
so now we're getting delegated we're transferred over to the the funny yeah sorry it's it's struggling to Yeah it's
1:50:40
ending up in a awkward loop so we can actually kill it and sometimes Yes so
1:50:45
it's like stuck in a loop right now going back and forth so yeah so sometime sometimes it is not the most reliable on
1:50:50
delegating so what we can do because it's it's actually struggling really hard no joke anymore just give me the
1:51:00
news for today great so you can see now it's transferring yeah so it was just because
1:51:06
it was in a weird state between the two but now we're properly getting delegated to the news and now it's there so long
1:51:12
story short what we could have done is just been more instructive inside of our agent in descriptions and just said "Hey
1:51:19
only answer questions if anything ever goes wrong that you can't help always just delegate back to the root agent." And that would have solved the problem
1:51:25
so hopefully you guys got to see some of the cool parts of multi- aents you got to see the limitations of why we have to
1:51:32
use agent tool calls you saw how we could improve our agent descriptions in
1:51:37
case anything goes wrong to say delegate to the manager agent to help with delegation processes and you got to see
1:51:42
a little bit of debugging along the way so what we're going to move on next is we're going to hop over to working with
1:51:48
our multi- aent solution but we're going to now start working with shared state that we are going to share between our
1:51:53
agents just so you can see that in action so let's hop over to example number eight and if you have any questions on anything so far feel free
1:52:00
drop a comment down below and I will happily help out thanks guys talk to you in the next one hey guys and welcome to example number eight where we're going
 Example 8: Stateful Multi-Agent
1:52:06
to focus on building a multi- aent system that starts to interact with state and so excited for you guys to see
1:52:11
this one because this is where we start to add in some additional complexity and really start to allow our agents to
1:52:17
solve complex problems and I'm so pumped for you guys to see this agent workflow in action because we're going to be
1:52:23
building a customer service agent that has multiple sub agents that basically allow us to handle all customer support
1:52:30
for a course that's basically the demo that we're going to be focusing on so let's break down the three different
1:52:35
parts of this example first things first we're going to head over to our whiteboard where we're going to break
1:52:40
down how all these agents work together in order to handle all parts of customer service for a course that we're selling
1:52:46
from there after we understand the high level of what's going on we're going to dive into the code so you can see exactly how everything works together
1:52:53
and then finally we're going to run this agent so you can see it in action so let's hop over to the whiteboard so we understand what's going on and how we're
1:52:59
going to build a multi- aent system to handle our course sales all right so let's look at the multi- aent system
1:53:05
that we're building that's going to help us with all sorts of customer service for a course that we're selling so at a
1:53:11
high level what we're doing is we've created a customer service root agent that has four different sub agents in
1:53:19
that it can work with now let's do a quick overview of what each one of these agents can do so first things first is
1:53:24
we have a policy agent that just gives some general information about the policy for the AI developer accelerator
1:53:31
course that we're selling and it can answer all sorts of questions refund questions anything you know related to
1:53:36
just general questions answering that our customers might have from there anytime someone wants to purchase a
1:53:42
course they're going to be directed to our sales agent and the sales agent is there to give people a little bit of
1:53:47
information about what's in the course get them excited about what we're doing and then if they do want the course it's
1:53:54
going to allow them to buy it and when they buy it this is where we're going to start to actually start to interact with
1:53:59
state so whenever a customer does purchase a course this is where we are
1:54:05
going to update the state so let's look at what's in state first and then we're going to come back to purchase course so
1:54:11
at a high level what we have inside a state are three different keys so we have username so you know who's working
1:54:16
and who we're talking to from there we have purchase course so this is where we can see what courses the person has
1:54:22
already accessed and a purchase course will always appear in this structure where we have the course ID so this is
1:54:30
going to be like oh you've bought course number one or course number two and then also the purchase date the purchase date
1:54:36
is super important because if the person wants a refund we can will 100% honor that if it's been less than 30 days so
1:54:42
let's go back to the purchase course so if someone does try to purchase a course what we'll do is go okay great you want
1:54:48
to buy this course well what we'll do is it looks like you do not have any purchase courses in state so I will
1:54:54
happily buy this for you charge you the the $150 and then from there I will update the state so I know in the future
1:55:01
if you have any questions that you have access to this course if we for whatever reason already have access to this
1:55:07
course like we bought it in the past the agent's going to go "Oh it looks like you already own this you can't buy it again." So just uh we're gonna have some
1:55:14
nice logic in our prompts to help make that happen now from there what we have is our course support agent our course
1:55:20
support agent always looks to see which purchase courses we've made so far and then it can answer questions about them
1:55:26
so for example once you buy the course it's going to say "Okay I can now help
1:55:31
you answer any questions about any of the modules inside the course." We don't want to give away too much information
1:55:37
about like what's happening in every single lesson and module inside of the course until people buy it so that's why
1:55:43
this agent checks to see hey have you bought it if so great i can answer any question and help you through any
1:55:49
problem inside the course so this is a pretty cool one and then finally if people do uh want to get a refund
1:55:56
they'll be directed over to the order agent and the order agent has one job which is to allow people to get refunds
1:56:02
on their courses so whenever someone does want a refund what'll happen is we'll check to see if they first own the
1:56:08
course and if they do great if they uh what we'll do is we will refund them send them their money back and we will
1:56:14
drop the purchase course from state so this is kind of how multi-state systems
1:56:19
work to where just a quick recap of why this is so awesome is we're now sharing state between all of our different
1:56:26
agents and depending on the state these agents behave differently so quick recap
1:56:31
sales agent will buy the course if it's brand new if they don't already own it if they do own it we'll say "Nope you
1:56:37
can't buy it again." The course support agent is going to go "Hey do you have access to this agent?" Great i can
1:56:44
answer questions do you not purchase this course already great i will not be able to answer those questions yet but
1:56:49
if you would like to purchase it great i'll refer you over to the sales agent and then finally the order agent will
1:56:55
say "Hey you have access to this course i can refund it to you." Or it'll say "Hey you don't have access to this
1:57:01
course you haven't bought it i cannot give you a refund." Okay that is our first multi- aent system at a high level
1:57:08
hope this kind of makes sense but what we'll do is we're now going to dive into the code so you can see how each one of these agents is actually interfacing
1:57:15
with state making changes to state and you're going to see some more prompt engineering to get all of these
1:57:21
different agents working properly specifically when it comes to using tools to manage state so let's hop in so
1:57:26
you can see all of this in action inside of our code all right so now it's time for us to dive into the code portion of
1:57:32
our multi- aent system and what we're going to do in this second part is walk
1:57:37
through everything step by step because I want to make this as easy as follow as possible so first things first we're
1:57:42
going to look at our main.py because this is where we have all of our core logic for creating our sessions creating
1:57:48
our runner and then actually handling user queries and once we understand quick recap of all of that we're going
1:57:54
to dive into looking at the core agents that are running everything inside of our application so we're going to look
1:57:59
at our root agent and we're going to look at all the sub aents with their prompts and tools so you can understand how everything is working together when
1:58:07
it comes to answering user queries updating state so that you can master multi- aent systems so we're going to
1:58:12
speed through the main.py because a lot of this is just a recap from what you've seen before and we're going to focus most of our time inside of these sub
1:58:19
aents so first things first is we are going to create an in-memory session service like we've done to where we're
1:58:24
going to save state just locally on our computer just for testing purposes we're going to create our initial state where
1:58:31
we're going to say hey you are working with user Brandon Hancock he hasn't purchased any courses yet and he hasn't
1:58:37
made any conversations yet we're just starting from scratch from there we are going to create a new session where
1:58:43
we're going to say you are a part of the app name customer support and this
1:58:48
conversation you're working on belongs to user ID AI with Brandon and we're going to pass in the initial state from
1:58:55
there we are going to create our runner like we've done multiple times in the past where we pass in two raw
1:59:01
ingredients the agent and then the session service and then once we have our runner created we're now ready to
1:59:08
start interacting with our users and this is just a simple everything from this part onward is basically us
1:59:15
allowing our users to type in a request to us us capture that request and then send it to our runner that's pretty much
1:59:21
everything that's happening here and outside of that there's just a bunch of logs so most of the code you're seeing
1:59:26
after this point is just adding a ton of logs to show off to our final users of what's actually happening inside the
1:59:33
application so long story short we're saying great give me your input i will
1:59:38
take in that input and I will pass it over to the agent once I pass it over to
1:59:43
the agent what I'm trying to do is just most of this is logs so most of this is not necessary i just wanted to make it
1:59:50
super easy for you to see everything that's happening once we start to run the code but the most important part is
1:59:55
right here where we're going to go okay great i now have the new message you gave me and I'm going to basically call
2:00:03
run async where run async goes all right I now have the user I know the session
2:00:09
and the new message I'm going to pass everything over to the agent so that it can understand what response it needs to
2:00:14
generate who the agent needs to delegate work to in order to give us a proper response from there we're going to
2:00:20
process the agent response which is mostly once again just logging statements where we're going okay great
2:00:26
I know what the agent agent said and I like I said 99% of this is just log
2:00:32
statements because most of the actual work is already being handled when you called run async so we're just trying to
2:00:38
like hey is this the final response great i will happily log everything so it's easy to view so I'm going to skip
2:00:45
through most of this because most of it you've already seen in the past so let's actually dive over to looking at our
2:00:50
core agent which is in the root folder of our customer service folder and you can see we have a root customer service
2:00:57
agent so let's walk through what's going on in this agent and how it's delegating work to its sub agent so at a high level
2:01:03
we're need to give it a description so it understands what this agent does and basically it's just the root customer
2:01:09
service agent for the community I'm building and from there what you can see is it has core instructions and most of
2:01:17
the questions that this is supposed to help with is to help the user with any questions and then always direct them
2:01:23
over to the specialized agent who can handle this response so the core things that you should be doing are you know
2:01:30
understanding what the user asks and then route them to this appropriate user and to help the root agent better
2:01:37
understand what the current state of the application is is we are going to pass
2:01:42
in the three different state values that we have where we're going to say hey the
2:01:47
username is username here's all the courses they've purchased so far and
2:01:53
outside of that here are all the core events that have happened when working with this agent now now that you have
2:01:59
access to all that information here's how you can access and pass along over to the appropriate agents that you have
2:02:06
access to so first things first you have access to the policy agent and here's what the policy agent is good for mostly
2:02:13
just answering questions about customer support course policy and refunds the sales agent is for answering any
2:02:20
questions about making purchases and you can see the current price of it finally if someone has a question about a
2:02:27
specific topic within a course you're going to send them to the course support agent and you can only do this if the
2:02:34
user has purchased the course and what's great is because up top we've already told the agent what courses the person
2:02:41
has purchased it's obviously going to know oh yeah I can't even direct a user over to this agent if they haven't
2:02:47
purchased a course and then finally what we're going to do is if anyone has any questions about purchase history or
2:02:52
refunds we'll send them over to the order agent so as you can see most of the instructions at the root level are
2:02:58
all about delegation and briefly explaining what all the underlying agents do and when we should call on
2:03:04
them so it's a lot of instruction giving from there the core part that you'll notice is we've just given it access to
2:03:10
the four sub agents that it has access to so let's dive through each one of these one at a time so first things
2:03:15
first we're going to look at the policy agent and think of this one as almost like a rag agent to where it's basically
2:03:21
just like "Hey you have a question cool i'll look at the policies we have and generate an answer." So you can see it's
2:03:26
just a ton of policy questions of like "No self-promotion here's the behavior you need to have here's some policy on
2:03:33
refunds here are access to you know course access." It's basically just a bunch of like general Q&A questions so
2:03:40
this is super helpful definitely recommend you stealing inspiration for this as you go off and build your own real world agents now let's go look at
2:03:46
the sales agent because this is where things start to get fun where we begin to allow agents to update state and
2:03:52
start to purchase courses so the sales agent you know hey you are a sales agent
2:03:57
here is all the current information about the current user and here is the course that you are trying to sell it is
2:04:04
a full stack AI marketing course it's $150 here's what's included in the course and here's what the user will
2:04:10
learn when interacting with the user you know please check to see if they already
2:04:15
own the course if they do own it remind them they have access to it if they don't have access to the course just
2:04:22
briefly explain the value proposition of the course and ask them if they want to purchase it then after they have
2:04:28
purchased the course what you'll do is track the interaction so we'll update event history and then basically be
2:04:35
ready to hand off the course to support because once they purchase the course we need to be able to answer questions about it so that's this at a high level
2:04:41
and if the user does want to purchase a course here is what will happen so first things first is we have to pass in tool
2:04:47
context because in order for our tool to update state we need to pass in tool
2:04:53
context and what we can do is first look at to see all right what inside of state
2:05:00
what courses has this user purchased and we need to pass in a default value so in
2:05:05
case for whatever reason this value in state is blank you always want to have a fallback value so this could if if we
2:05:12
were working with something else this could be a blank like no courses but in our case we're we're storing all of our
2:05:18
courses in a list so that's why we're putting it in a list from there what we're doing is some simple Python logic
2:05:23
to say okay I would like to iterate through all of the different courses that the user has purchased to check to
2:05:30
see if the course ID basically I'm just trying to get all the course IDs and then from there what I'm trying to check
2:05:36
to see is like okay has the user purchased this course ID so we're saying if this course ID is in the list of
2:05:44
course IDs we have what we're going to do is say hey you already own this course you can't buy it again so that's
2:05:50
what that logic says then what we're trying to do next is we're going to go great so we've made it this far we know
2:05:56
they don't have access to the course so now what we're going to do is purchase the course so what we're going to do is
2:06:02
we're making a new list where we're going to iterate through all their existing courses and continually add the
2:06:08
existing courses to the list and then finally what we're going to do is add the new course we've just purchased for
2:06:14
them to the list and then once we have the new state up and ready we're going
2:06:19
to save it to the state that's shared amongst all the agents so quick recap what we're doing in this logic right
2:06:26
here is saying great I'm updating your list of courses you own with a new one
2:06:32
and once we have the proper updated list of all the courses you've bought we're then going to save the updated list to
2:06:40
state that's all we're doing right here and we're also going to update your interaction history to say hey you
2:06:46
purchased this course at this timestamp so that we have a history of all key
2:06:51
events when working with this agent and specifically so that when other agents are looking at what's happened so far
2:06:58
they can easily look at the interaction history all right finally from there we are going to follow tool best practices
2:07:04
where we are going to update and return state so state instead of just saying
2:07:09
"Hey true we purchased it." No we follow best practices where we give status we give a message and we properly say
2:07:16
"Here's what you bought in at this time stamp." So that was a little bit of a deep dive but hopefully you got to see a lot of the core principles of how we're
2:07:22
passing in state dynamically how we are following best practices and allowing
2:07:28
our tools to access state through tool context and how we are reading from
2:07:33
state and then from there you're seeing how we are saving back to state so
2:07:38
you're seeing you know you're becoming a master of all the core components of working with multi- aent systems and
2:07:44
following best practices with tool calls okay we are almost done reviewing this so let's look at the core support agent
2:07:50
and we'll speed through these cuz the rest of these are pretty much just instruction heavy so at this point per usual we're passing in state into this
2:07:58
agent so it knows exactly what's going on and then based on what courses the
2:08:03
person has purchased we then can answer questions appropriately so if the user
2:08:09
owns the course great what we'll do is help them with the course cuz if they own it we can answer questions about it
2:08:15
if they don't own the course we're going to direct them over to the sales agent so the sales agent can say "Hey you don't own this but it looks like you're
2:08:21
interested in it i'd be happy to answer questions you just got to buy it first so then what I do is then just give a
2:08:27
ton of information about the course so I say "Hey in section one here's what you learn in section two here's what you
2:08:32
learn." And I just keep going throughout the rest of the course so that there's some highle overview of what's being
2:08:37
included in the course finally the last agent is the order agent and the whole purpose of the order agent is to allow
2:08:45
persons to ask questions about the purchase history and process refunds so what we're doing is giving all the state
2:08:51
per usual hopefully you're starting to see the core principles seeing used over and over and over again and then what
2:08:56
we're trying to do here is just say "Hey if they ask about the purchases just let them know what they've purchased if they
2:09:02
want to refund what you need to do verify that they own it and then from there if they do own it give them a
2:09:08
refund if it's been under 30 days so yeah that's pretty much all we're doing inside of our agents and if they do get
2:09:16
a refund and things go through successfully what we're trying to do per usual the exact same thing what we did
2:09:21
with the order call a second ago the order tool call but now we're just undoing it so undoing it follows the
2:09:27
exact same process at a high level you get state you check just to confirm to make sure they own it if they do own it
2:09:35
what we're going to do is remove the course from the list once we've removed the course from the purchased course
2:09:42
list we're going to update state we're going to update our interaction history to say great it looks like we did get a
2:09:50
refund so that's what we're updating our interaction history with saying they refunded the course at this time and
2:09:55
we're saving it back to state and then we're returning the tool call to say yep this was a success they refunded the
2:10:02
course and here's some additional information okay so you now got to see all the core parts of this in action so
2:10:08
what we're going to do is now that you've gone through and seen everything understand part by part from prompts to
2:10:13
tool calls to tools updating state so what we're going to see now is we're going to go off and run this so you can
2:10:20
see exactly how all of these works together so let's kick everything off and start running the demo all right so
2:10:25
now let's dive into the fun stuff where we're going to run our agents and as a quick reminder you need to be in folder
2:10:31
number eight so you can run this example and you need to have your virtual environment activated once you've done
2:10:36
both of those we can run everything so type in Python main.py and this will create your session it'll get everything
2:10:42
set up and ready to run so we can now say "Hey what courses do you have for
2:10:49
sale?" Now what this will do is spit out a ton of logs so you can see everything that's happening so you can see we
2:10:54
always have a before state and an after state so you can see exactly what's happening and right here in the blue in
2:11:01
the middle you can see the agent response so you can see it goes okay great I have a course available it's
2:11:07
priced at this amount of money and you can see that the customer service agent gave us this response so we can say yes
2:11:13
I would like to purchase that purchase that course from there what
2:11:20
will happen is we will be sent over to the sales agent who's responsible for closing the sale and we goes great I can
2:11:26
help with that here's the course it's a sixe program the price is this would you like to proceed with the purchase yes
2:11:32
please purchase the course from there what will happen
2:11:37
is you can start to see we make some state changes so before saying I'd like to buy the course we didn't have access
2:11:43
to it afterwards though you can see the agent said great you successfully bought it you're enrolled would you like to
2:11:49
start learning and you can see that our state after running this request now has the course so awesome we now have our
2:11:55
agents managing our state through tools really cool so now we can say yes what
2:12:01
are all the modules inside of the program from there what will happen is
2:12:08
we should be directed over to the course support agent yep course support agent
2:12:13
and the agent will say "Okay yep because you have access to all of the because
2:12:18
you've purchased this course I can give you answers now you bought it on this date and here are all the different modules do you have any questions about
2:12:24
anything in particular?" And we could dive in but in our case we're going to say "No I'm good i don't want the course
2:12:32
any more give me a full refund." And what this should do is move us over to
2:12:39
our support agent so what you can see here is our before state shows that we
2:12:45
have access to the course then we should get delegated over to the proper agent
2:12:51
in our case it's going to be the order agent and it'll go great I have refunded your course completely the money will be
2:12:58
sent back to your account in three to five days and you've been remove the course has been removed from your account and what's awesome is you can
2:13:04
now see our course has been removed from state so our order agent properly removed the course so yeah so this was a
2:13:10
quick overview guys of showing you how multi- aent systems can work together and they can be more intelligent by
2:13:16
sharing state because when they share state they can know exactly what you have access to don't have access to and
2:13:21
respond appropriately so hopefully You guys found this example super helpful and now it's time for us to move over to
2:13:26
example number nine where we're going to dive into callbacks so you can learn how we can manage all sorts of interactions
2:13:33
between agents and LLN and have full control over our agent workflows so let's hop over to example number nine
2:13:38
hey guys and welcome to example number nine where you're going to learn about the six different types of callbacks that you can add to your agent workflows
 Example 9: Callbacks
2:13:45
to help you control every part of your agentic systems and there are six different types of callbacks that we're
2:13:51
going to cover here throughout this example so the before and after agent call back the before and after model
2:13:58
call back and the before and after tool call back so what we're going to do in this example is first head over to the
2:14:04
doc so you can see what each one of these different types of callbacks do and some of the best practices and then
2:14:09
from there we're going to quickly cover each of these different examples I prepared for you guys and run them so this one's going to be a little bit more
2:14:15
interactive than the other examples so let's go ahead and hop over to the docs you can understand everything you need to know about callbacks all right so the
2:14:21
first thing I want to show you guys is this highle overview of when each of the callbacks gets triggered inside of ADK
2:14:28
so the first two callbacks that you're going to see in use are going to be the before and after agent call back these
2:14:35
are going to be before any logic happens inside of your AI solution so this is
2:14:40
right when things get kicked off what do you want to do and then once everything is done being processed with your agent
2:14:46
what do you want to do with the information that you now have so that's the before and after callback and you're
2:14:51
going to see some more examples of these in just a minute the next callbacks I want to show you are the model callbacks
2:14:57
so the before and after model callbacks are going to be used before you pass information over to Gemini or OpenAI or
2:15:04
Claude what do you want to do with the request you're sending over to these models so you can do a little bit of
2:15:09
pre-processing and adding some information and you can do some like validation or some checking afterwards then finally we have before and after
2:15:17
tool call backs because our agent has the ability to call tools such as get the weather get the stocks and sometimes
2:15:24
what you can do with these is maybe add in some validation and add in some additional information and then once you
2:15:31
get back results from the tool you can process it to make sure it included the proper information so these are the six
2:15:36
different callbacks we're going to be diving into so let's head over to the doc so you can see some of the core
2:15:42
principles that ADK tells us when and why we should use each one of these callbacks all right so I've zoomed
2:15:47
everything in so we can easily walk through the six different callbacks and cover when and why you would want to use
2:15:54
these callbacks so to start off let's look at the before agent call back and this is the one I use the most and
2:15:59
you'll most likely use the most as well as you work with ADK and you know you
2:16:04
saw the before agent call back is triggered before anything gets called inside of our agentic system and the
2:16:12
main reason you'll want to use this different callback is to set up resources and state before the agent
2:16:20
runs so this is where I like to do some state hydration which is just a fancy
2:16:25
word to say hey before this agent runs let's go fetch some information about the user so let's grab their current
2:16:31
order history let's go grab whatever subscription they have and let's just give all that information to the agent
2:16:37
so when it's running it has everything it needs to know so main reason to use this one is for setup state setup is
2:16:44
when I like to use this one okay now the next one you're going to be using is the
2:16:49
after agent callback and this one runs after everything is done so you've you've made all the requests to the LLM
2:16:56
you've done all the tool calls the agent's done running then the agent call back is triggered now when and why would
2:17:04
you want to use this one so their main options are for postexecution validation and logging those are the main ones I
2:17:11
like to use so after the agent's done running you can just make some logs to if you have this application running in
2:17:17
production you can just make some additional logs of like hey I gave the user this information so you can just
2:17:23
really just save it that's the main one I like to use it for and if you want to modify any state so if you want to keep
2:17:29
up with the number of requests the user has made this is a great place to modify state afterwards okay the next one we're
2:17:37
going to look at is the before model call back now the before model call back just remember this is before we trigger
2:17:43
OpenAI Gemini Claude whatever model we're working with we trigger this before we send the request over to the
2:17:51
large language model now when and why do we want to use this well a few different
2:17:56
examples that ADK recommends is for adding additional dynamic instructions
2:18:01
or injecting some examples based on state or model configurations now I
2:18:06
don't really use this one that much but what you could do is also add in some guard rails and you'll see this in an
2:18:12
example that we're going to work on together but you can use Python to review the request we're sending over to
2:18:18
the large language model to say like hey are they using any profanity or are they doing anything that's you know they
2:18:24
shouldn't be asking inside of our agent and you can just do a quick check to say oh they are okay I'm not going to allow
2:18:30
the user to send this request to the large language model this is not allowed so that's what we're going to be working on together and you're going to see
2:18:37
later in a second how you can you know quit the the loop if the user tries to
2:18:43
ask for something that they're not allowed to so you can either yeah skip it basically so you're going to see that in a second then the next one you can
2:18:49
see is after model call back so once Gemini or OpenAI gives us an answer what
2:18:55
we can do is alter the information given back to us so that's one of the main
2:19:01
reasons I like to use the aftermodel callback it is to reformat the response so if there's any certain words you
2:19:07
don't want the agent to use you can actually replace keywords you can log anything you want or you can censor or
2:19:14
blur out information so for example if the agent returned something it wasn't supposed to like maybe the user's ID or
2:19:21
anything like that you could actually blur it out so the user can't see it all right the next two that we're going to
2:19:26
look at are going to be tool execution callback methods specifically the before and after so the before tool callback it
2:19:34
does exactly what it it says it gets triggered before the tool gets called and the main reason I like to use this
2:19:39
one are to basically inspect and modify the tool arguments or perform
2:19:45
authorization so for example if the user was going to make a request to let's say
2:19:50
add an additional item or purchase it we could make sure that the user ID that
2:19:55
was making the request actually matches the account that we're working with to make sure nothing weird's happening or
2:20:01
they're not trying to trick the LLM to make a tool call they weren't supposed to so this is when it comes down to
2:20:06
authorization checks so the other one that we can start to work on is the after tool call back and the reason most
2:20:12
of the time people use this one is to really just inspect modify and log the
2:20:18
tour results so those are the main reasons people use this one so but this one like I said yeah this one's not the
2:20:24
craziest or you could save information to state so these are all the six different types of callbacks that you
2:20:29
can use highle purposes but now what I want to do is dive into the three different examples I've set up for you
2:20:36
guys so you can see each one of these callbacks in action at a high level and
2:20:41
understand how you can use them in your code so let's hop over to our cursor and start seeing these callbacks in action
2:20:47
all right so now it's time to get our hands dirty and dive into some code and we're going to walk through each type of
2:20:53
callbacks one at a time so we're going to look at the code run it so you can see everything in action and we're going to iterate for each of the different
2:20:59
types before the agent ones the model ones and the tool ones let's go ahead and dive in to our before and after
2:21:05
agent callbacks so we're going to open up our agent.py file for this quick example so you can see the before and
2:21:12
after agent callbacks in action so in order to add callbacks to your agents
2:21:18
what you can do is update the before and after agent callback like they make this so clear when it comes to naming and
2:21:24
what you want to do is for each one of these callbacks you want to point to a function now there's a few core things
2:21:30
you need to know about these functions before you start to work with them so the first thing is you need in order for
2:21:36
callbacks to work appropriately is you need to pass in the callback context this is what's going to allow the agent
2:21:43
to access state and all the other necessary information it needs to properly handle what's going on from
2:21:48
there you want to make sure the return type is optional and returning content now what why why are we doing this well
2:21:54
you'll see in just a second if you want the agent to continue as normal you
2:21:59
return none so that's why it's optional because we're going to return none if everything's okay if for whatever reason
2:22:05
the user did something we didn't like we would return a message saying "Hey I'm skipping this because of whatever
2:22:12
reason." So you return none if things go good you return messages if you want to skip what's happening so that's uh
2:22:19
something that was a little weird to me when I saw this for the first time but let's dive into this before and after agent call back so you can see exactly
2:22:25
what we can do with these different callbacks so if you remember what we want to do with the main reason we want
2:22:31
to use before agent callbacks is to log and to hydrate state so what you can see
2:22:36
is we're taking in the callback context and the first thing we're doing is we are grabbing state with state what we're
2:22:43
doing is just to test out some initial information is we are going to say all right state do you have agent name as a
2:22:51
key if not I'm going to update state to include the name and then from there what we're going to do is we're going to
2:22:56
keep track of our request counter so you can see hey does request counter exist in state if not this is obviously our
2:23:03
first request otherwise we're going to increase the state request counter outside of that we're going to add a
2:23:10
third key to state where we're going to keep track of the request start time because in the after callback agent
2:23:17
we're going to see okay well you started at this time and then you finished at this time great I know it took about 10
2:23:23
seconds 2 seconds 1 second to generate this entire response outside of that we're just going to do some logging so
2:23:29
we can see and keep track of things as we run it awesome from there you can see we have an after agent call back who
2:23:35
accesses the same call back state and we're doing pretty much the exact same thing so now we're going to grab state
2:23:42
Now we're going to get the current time and then from there we're going to look at okay we're going to grab the start
2:23:48
time and we're going to subtract the current time from the current time from
2:23:53
the start time and this is how we get oh it took you 2 seconds to run this entire request and we're just going to log this
2:23:59
all out so enough talking about this at a high level let's go ahead and run this
2:24:04
root agent so you can see it in action so let's clear things out let's make sure we are in example number nine and
2:24:10
if you look in example number nine there are multiple folders and we want to go to the before and after agent so cd
2:24:18
before after agent great once we're here we can now run everything so we're going to type in adk web and this will trigger
2:24:25
out the you know the web interface that you're used to and we'll open it up and what we can do here let's get everything
2:24:32
running so select an agent i think I did something wrong one second so I made a
2:24:38
quick mistake we should not have cded all the way into these agents we should just run the program from the highle
2:24:45
folder so what you need to do is just run adk web here and this will get everything kicked off and going properly
2:24:52
so now you can see it gives you the ability to select an agent and we're going to run the before and after agent
2:24:57
so what we can do is say hey how are you doing and this is just
2:25:03
going to showcase a few of the core components that we have so hey I'm doing well from there we can say it's doing
2:25:09
well and then if we dive into state you can see it saved all the important information that we asked it to do when
2:25:15
it came to running an agent and we can say what is your name and what we would
2:25:20
expect this to do is to update the request counter and the the start time and if we close out of this session and
2:25:27
hop back to our logs you can see because we had a bunch of logs you can see oh the second request took 60 seconds and I
2:25:35
can see if I go even further up uh to call back number one you can see the first request took almost 2 seconds so
2:25:42
you can see that it's working and it's properly logging everything that we showed so now what we're going to do is
2:25:48
quit everything and we are going to move over to the next callbacks which are before and after model okay so now it's
2:25:54
time for us to look at the before and after model callback example so this is the agent.py inside of this folder right
2:26:02
here so what we're trying to do inside of this agent is showcase how you can filter content so someone gives you a
2:26:08
request that you don't want you can quit and say "Hey that was a bad request." And we're going to log everything now
2:26:14
before we dive into looking at these two different callbacks I want to show you guys how easy it is to add them into
2:26:20
your your agents so instead of doing the before and after agent callback we now
2:26:26
just say before and after model call back as simple as that and per usual we just pass in the callback function we
2:26:32
want to trigger now here's what's different in these new callbacks instead
2:26:37
of only providing the callback context you also need to provide the LM request
2:26:43
where the LLM request is going to include the message that we are trying to send over to Gemini or OpenAI so what
2:26:50
you can see is we can do exactly what we did last time we can pull out the state
2:26:55
grab our agent name and then from there what we're going to do is extract the user's last message and the reason why
2:27:02
we're trying to do that is we want to iterate through all the message content that was sent to us and we're reversing
2:27:08
the list so we can get the newest item that's from the user and once we have that latest message from the user we're
2:27:15
going to save it here then what we're going to do is showcase that we're going to say if we have that user message what
2:27:23
we want to do is just showcase it then from there what we're going to do is say
2:27:28
all right does that latest user message include a bad word so we're going to say hey does it include the word sucks if so
2:27:35
what we're going to do is throw a bunch of logs saying hey inappropriate content was detected and this is where we can
2:27:43
start to alter the life cycle of our agents and our LLMs so instead of
2:27:49
returning none we're going to return an LLM response and this LLM response is
2:27:54
going to go hey you tried to make a request and we're going to say hey I
2:28:00
cannot return like we're going to basically instead of the LLM responding we're going to respond for it so we're
2:28:05
going to say hey this model we're going to say I cannot respond to this message because it includes inappropriate
2:28:10
language please rephrase your request without words like this now that was only if the message included a bad word
2:28:18
if it did not include a bad word what we're going to do is just return none because returning with none just
2:28:25
continues with the normal life cycle then finally what we're going to do is with the other option which is the after
2:28:32
model callback all we're going to do is do some simple replacements so if the
2:28:38
LLM responded with something we can actually change the response so I'm going to scroll down just so you guys
2:28:43
can see it so if for whatever reason the LLM responded with an empty response we're just going to skip it otherwise if
2:28:49
the LLM does include some text we're going to say okay what I would like to
2:28:55
do is iterate through all the words you said and if you included a word like
2:29:01
problem or difficult I want to change the word with challenge or complex and
2:29:06
then what you can do is you go through the original you go through the original response that they gave us and we're
2:29:12
going to save it to modified text so a new variable and we're going to iterate through each one of the words that we
2:29:19
want to replace and we're going to replace them inside of our text and we
2:29:24
are going to return if if any of the words included in our case problem or
2:29:29
difficult we are going to replace them and we are going to return our modified
2:29:35
answer so if we replace something we're going to say modified true and so if we modified we're going to say "Hey I
2:29:41
definitely did change something and I'm now going to return that LLM response."
2:29:46
That's all we're doing if it did not include a word we were trying to replace we're going to return none so that's all
2:29:52
we're doing inside here and inside the readme I actually have a few different examples that you can test things out
2:29:58
with so let's see down here I have some examples that you can run let me show
2:30:04
you guys really quickly yeah so to test model callbacks you can say this website
2:30:09
sucks can you help me fix it so let's go run everything so you can see these in action so let's run it again so we're
2:30:16
going to do ADK web this will trigger our website to spin up now we can go to
2:30:21
the before and after model session and we can type in this message this website sucks can you help me fix it and now the
2:30:28
model's instantly going to say "Hey I cannot respond to messages when using words like suck." So this is pretty much
2:30:35
just exactly what we told it to do so if you were to hop back over to our code you can see this is the exact message we
2:30:42
said to do right here i cannot use respond with messages like that okay cool so now let's try out the other one
2:30:48
so we can say what's the biggest problem with machine learning today so we can now try this example so we're going to
2:30:54
open it up and we would expect it to replace the word like we told it to we would expect it to replace phrases like
2:31:01
problem with challenge so let's open everything up and now inside the before and after model call back if I was to
2:31:09
send this request in instead of it saying challenge it will get replaced and I believe we can yeah so we can dig
2:31:17
in to the response so one of the biggest So this is what the model responded to it responded with one of the biggest
2:31:23
challenges or one of the biggest problems with machine learning is that it's data bias but what you'll notice is
2:31:29
the LLM responded with the word problem but because we updated the model after
2:31:34
callback we said "Hey use the word challenge here." So you can see it is it's working in real time so this is a
2:31:40
cool way if you want to like make sure you speak always in a certain way you can alter the response or filter out something if they give you an API key or
2:31:46
something that you shouldn't show back to the user you can always filter it out okay cool so you now got to see before
2:31:52
and after model call backs in action so now what we can do is go over to the final call back which is the tool before
2:31:59
and after callbacks so let's hop over there so you can see this one in action okay so it's time for us to look at our
2:32:05
final example which is going to be the before and after tool callbacks and for this example we are building an agent
2:32:11
that looks up the capital cities of different countries and because we're working with the before and after tool
2:32:17
callback well we obviously need to have a tool that we're trying to alter the functionality of for these before and
2:32:24
after capabilities so what I'd like to do is first just show you the tool we're trying to use and then we're going to
2:32:29
walk through what we're trying to alter in these callbacks okay so what tool are we trying to use well we're creating a
2:32:35
tool that takes in a country and once it takes in a country it looks up to see does that country exist in here and if
2:32:42
so I'm going to return the capital city so yeah that's what the tool is trying to do at a high level super
2:32:48
straightforward but now let's first dive into the before tool call back so you can see it in action so the before tool
2:32:54
call back has a few key parameters you have to pass in the first is the tool what tool are we trying to use from
2:33:02
there we need to know what arguments we're passing into that tool and then finally the tool context so this is how
2:33:08
we access state like in all the previous examples so in this example we're trying to do two different things first if the
2:33:14
user gives us uses the tool get capital city and they pass in an argument such
2:33:21
as America we want to alter that argument to say United States so we're
2:33:27
basically correcting the arguments that a user passes to us and we're going to return none because return none just
2:33:33
means proceed as you normally would but the kick is we have altered an argument
2:33:38
passed in another option is if the user calls get capital city tool and the
2:33:44
country they pass in is restricted what I want to do is alter this tool call to
2:33:51
return this result so we're not going to call the tool we're canceling the tool call before it happens and just
2:33:56
returning this result so that's exactly what we're trying to do with the before tool call back so what we can do is run
2:34:03
this so we can see it in action so let's get everything ready so we are going to do ADK web and we are going to open up
2:34:11
our before and after tool and we can say what is the capital of America and what
2:34:19
it'll do is it will get the capital city and it will return the capital city and it'll say oh it was Washington DC now if
2:34:27
you look here what happened though is we actually made some changes and you can't see the changes inside ADK web you have
2:34:35
to hop back to our terminal and inside of our terminal we had some raw logs set
2:34:41
so you can see the user passed in what's the capital city of America but then
2:34:46
before the tool got called right here so function call you can see we updated the
2:34:51
arguments to now say United States and because normally it would have just passed in America but we altered it to
2:34:58
pass in United States so pretty cool that it did that now let's go try the other example so in our case the other
2:35:05
example we wanted to try was if they asked about restricted so let's open this up and we can say on our before and
2:35:12
after tool call what is the capital of restricted and in this case it's going
2:35:18
to return like hey I can't fulfill that request you know not valid please return a valid country but if we were to do a
2:35:24
normal country so like what is the capital of let's just do France this
2:35:31
would work nor like normal like it was supposed to do and it would go off and say "Yep the country is France i'm
2:35:38
calling this tool and then I got back the answer which is Paris." So yeah we have the before functionality working
2:35:44
like a champ so now let's quickly review the after call toolback so when it comes
2:35:50
to the after tool call back this is where we can alter the tool response that's the main functionality of
2:35:57
altering the tool call back so what you can see is we're just doing a bunch of logs to say like hey what tool got
2:36:03
called what were the initial arguments passed in and what was the original response of the tool then from there
2:36:09
what we can do is make some changes oh and before we do that I do just want to call out the properties you do need to
2:36:15
pass in the tool that's getting used the arguments that were passed to the tool and then tool context and tool response
2:36:21
these are the main ones so the only one that got added new was the tool response because obviously the tool generated a
2:36:26
result so we now have the opportunity to alter it so what we're going to do is we're going to say all right if the user
2:36:33
basically passed in so if the tool let me restate this if the tool get capital
2:36:38
city was called and Washington DC was in the original result what we want to do
2:36:44
is alter that response to say okay I want the modified result that I'm
2:36:51
storing here to say okay the answer was Washington DC and then we're going to add this fancy little note at the end so
2:36:57
we have a nice little emoji So that's all we're doing we're just long story short for all of this code right here is
2:37:03
we're just altering the original response that was given to us to include the original result and then add in some
2:37:09
additional text at the end so let's try this out so let's do we're going to run
2:37:14
it again and this time we're going to say what is the capital of USA let's go
2:37:19
ahead and open this up and we're going to select the before and after tool and we're going to say what is
2:37:25
the capital of USA and now what it'll do is it will return the original result
2:37:32
which was just Washington DC but then it's adding that fancy note at the end that we told it to so you've officially
2:37:38
altered the tool response using the after tool call back okay you guys are
2:37:43
now officially pros when it comes to all six different types of callbacks that
2:37:48
you can use inside your agents super excited for you guys to wrap that one up because those are super helpful and
2:37:54
you're actually going to see us use the before agent call back numerous times going forward because it's a super handy
2:38:00
one to use so now that we've knocked that out of the way we're going to start diving over to our workflows which are
2:38:06
going to include the sequential parallel and loop agents so let's hop over to example number 10 so we can start
2:38:12
working on sequential workflows hey guys and welcome to example number 10 where we're officially starting to work on our
 Example 10: Sequential Agents
2:38:18
first type of workflow agent and in this example we're going to focus on the sequential workflow where agents work on
2:38:25
a task one after another so what we're going to do in this example is first hop over to the docs look exactly at what
2:38:32
ADK says about these workflow agents and then we're going to look at this lead qualification pipeline example that I've
2:38:39
created for you guys where we have validator agents that then pass the results to a score agent which then
2:38:44
passes the result to a recommendation agent and then in part two we're going to look at this code that I've set up for you guys so you can see a working
2:38:50
example and in part three we're going to run it so let's hop over to the doc so you can see everything in action all right so we're in the sequential agent
2:38:56
docs so let's quickly cover what they are how they work together and when we should use them okay so sequential
2:39:02
agents basically it's a type of workflow agent which means our agents are going to work in a particular pattern and in
2:39:08
our case when working with sequential agents all the sub aents you provide to a rootle agent are going to work in the
2:39:15
order that you specify so the most important thing to note is when you look at the code agents will work in the
2:39:22
order that you pass them in in the sub agent list so if you have agent 1 2 3 it will always run agent 123 so execution
2:39:29
occurs from first to last okay so here's an example of why you would want to use a sequential agent let's imagine you
2:39:36
were building an agent that could summarize any web page using two tools it first wanted to get the page content
2:39:42
and then summarize the page well because you can't summarize a page until you have the page content this would make
2:39:49
for a great use case to start using sequential agents where first you would always get the page content and once
2:39:55
we've grabbed the page content we would then go over to option agent number two where you would then summarize it so
2:40:02
that is a sequential agent in a nutshell so here's just a quick example of what it looks like inside a sequential agent
2:40:08
you'll see that you always provide sub agents where this agent will always be triggered before this agent and the
2:40:15
important thing to note is that you are not you know passing state like this arrow does not mean you're passing
2:40:21
information from agent A to agent B you have to use shared state like we've been doing throughout the rest of these
2:40:27
examples here together today so if you wanted agent two to have information that agent one generated you would need
2:40:34
to you know write that to state and then sub agent 2 would pull that down so that's super important to note so what
2:40:41
we can do is we're going to hop over to the code example I've created for you guys walk through it step by step so you can see how you can create these agents
2:40:48
share state between them and work together on building you know your multi- aent systems that work in a nice
2:40:54
workflow so let's hop over to the code all right so let's start to look at how you can start to use sequential agents
2:40:59
with inside of ADK thankfully it's a super simple change so right now we are inside of the lead qualification folder
2:41:06
and we are in the lead qualification agent and in order to start working with sequential agents all you need to do is
2:41:14
import sequential agent from here normally what you would do is import agent so if you look at all of our other
2:41:20
multi- aent solutions every time we're importing our regular agent but this time instead of importing just a plain
2:41:27
old agent we're saying "All right ADK you are now working with a sequential agent." And inside of a sequential agent
2:41:34
I first want you to you know trigger this this sub agent so the lead validator agent the lead score agent and
2:41:40
then the action recommener agent so in this example what we're trying to do is create a lead qualification pipeline
2:41:47
where I can give some information to this sequential agent and it will save
2:41:53
the result for me so I can figure out should I work with this customer or should I not so what we're going to do
2:41:58
is first walk through each one of these agents at a high level so you can see what they do and understand how we're
2:42:03
saving the result of each of these agents so that the result from agent one
2:42:08
gets passed to agent two and the result from agent two gets passed to agent 3 so let's look at how we can do that so
2:42:15
first things first we are now looking at the lead validator agent and here's all
2:42:21
we have to do we are going to give this lead validator some instructions saying "Hey you're here to validate different
2:42:28
clients that I give to you so I'm going to give you lead information and what
2:42:33
this lead information should include to verify that it's a complete qualification basically to make sure
2:42:39
that we're given all the information we need you're going to get their contact information what they're interested in
2:42:45
what they need and some information about the company that they currently work for if they're if they give us all
2:42:50
the information we need as a valid contact we're going to say valid otherwise you're going to return invalid
2:42:56
that's all you need to do and what we're going to do is save the result of this entire agent to the output key so if you
2:43:04
remember from way back when we were working on initially using agents to save the results to state this is going
2:43:10
to save valid or invalid to this key inside of state so validation status
2:43:16
will either say valid or invalid okay cool so now that we've understand what agent one can do let's go look at the
2:43:22
lead score agent which is going to score the lead that we are given to determine if they're a good fit for us so we're
2:43:28
going to say okay your job is to score and what you need to do is look at the information that is given to us and
2:43:35
score the lead from 1 to 10 and I want you to score based off of how urgent the
2:43:40
problem is if the person is a decision maker if they have time and budget from
2:43:46
there what I want you to do is just give me back a numeric score and a one-s sentence justification of why you think
2:43:52
we should work with them so here's some example outputs so we could say eight which is like hey they're a good
2:43:58
decision maker clear budget the great contact or three we could say hey you know they're not really interested no
2:44:04
timeline no budget so they're not a great contact and once again we are going to save the output of this to the
2:44:10
lead score key so that the result like one of these will be saved to state okay great so we're all just building up
2:44:17
towards working towards the final step in our sequential workflow which is all going to be inside the action recommener
2:44:24
agent now what this agent is going to do is it is going to take in all the
2:44:29
information that we've built so far from our previous steps inside of our sequential workflow so we're going to
2:44:35
pass in the keys right here and if you just notice the lead score key this is
2:44:40
exactly what is mentioned here so lead score key this is exactly what we have
2:44:46
in our recommener so this is where those keys that we were saving the key values we were saving to state this is where
2:44:51
we're now getting access to them so we can start to share state between our agents and from there we're going to say all right using the information that
2:44:58
I've just given you I want you to create a recommendation on what next steps we
2:45:04
should take for this agent so if the lead score is invalid just say what
2:45:09
additional information we need then based on the other types of score like if it's a bad score a good score or a
2:45:16
great score suggest what we need to do next so this is sequential workflow in a
2:45:21
nutshell so what we can do now is we'll hop back to our root agent so we can kick everything off so you can see it
2:45:28
all in action so what we're going to do is we're going to make sure that we are inside of our sequential agent workflow
2:45:35
and I'm going to first open up in the readme I have some examples that you can test here so we'll first try an
2:45:42
unqualified lead so let's run this so ADK web and what we'll do is this will
2:45:48
trigger our interactive session so we can start chatting with it so now we can pass in a lead and if you notice to
2:45:55
start there's nothing in state but if I pass in a lead for John Doe and he's a
2:46:00
bad lead we can watch what happens so agent one would trigger then agent two
2:46:05
would trigger then agent three so all of these agents right here are getting wrapped up inside of a sequential
2:46:12
workflow so sequential workflow really is nothing more than just a wrapper around all the three agents that you
2:46:18
want to do all the work for you and what you would notice is as we were running the agent in real time it was saving the
2:46:25
results to state so agent one spit out the if it was valid or not agent two the
2:46:31
score was you know printing out the quality of the lead and a justification of why they got that low score and then
2:46:37
the final agent our third agent was saying "Hey based on the two previous pieces of information I recommend that
2:46:44
John Doe is not a good client for us to work with i recommend just continue doing some education to see if he better
2:46:51
understands what's going on and if we can work with him." So that's option one but what we could do is let us hop back
2:46:57
over to our examples that we have set up and in this time we're going to pass in
2:47:02
a qualified lead so let's scroll back up to where things got kicked off a second ago and now we can do another message
2:47:10
and this time do it for a great client so Sarah is a great client great budget leadership position all around great
2:47:17
spot so you can see that's exactly what the agent said too this is the valid lead this is a high score she's a CTO
2:47:24
she's trying to you know she has a budget and a timeline and the recommendation is that Sarah's trying to
2:47:29
switch away from a competitor what I recommend to do is schedule a demo with her and prepare a proposal yeah you can
2:47:35
see it did exactly what it was supposed to do and it saved everything to state and that's how it was able to come up
2:47:40
with this awesome response right here so yeah that was sequential workflows in a nutshell hopefully that made sense
2:47:46
because if you're familiar with working with tools like Crew AI this is probably
2:47:51
more of what you're used to to where you have different agents all working on one task so definitely sequential workflows
2:47:58
are amazing and we're now going to move on to the next example where you're going to start to see how we can
2:48:04
actually trigger multiple agents to go work in parallel and then combine the answers so let's hop over to example
2:48:10
number 11 all right welcome to example number 11 where you're going to start to work with parallel agents now in this
 Example 11: Parallel Agents
2:48:16
example we're first going to head over to the Google doc so you can see why they recommend to use these agents when
2:48:22
to use them from there I have a pretty cool code example where we're going to monitor all of our computer analytics
2:48:28
and you know use parallel agents to quickly go off and find all the information about our computer and give us a nice little report and then in the
2:48:35
third example we're going to run this code that I've created for you guys so let's hop over to the docs so you can
2:48:40
see all the core information you need to know okay so let's dive into what are parallel agents when you should use them
2:48:46
and then a quick example of how they all work so first things first a parallel agent it's another type of workflow
2:48:51
agent where we are structuring our agents in a particular format to go off and do work now in the the case of
2:48:58
parallel agents instead of agents you know being triggered one after another which is usually slow because you have
2:49:04
to wait for agent one to finish then agent two then agent three well with parallel agents what we're doing instead
2:49:09
is we are going to do things in parallel so where all of our agents are going to generate and do work all in parallel so
2:49:17
it's much faster and then afterwards once all the work's done is we can use all the information that they saved to
2:49:23
state and then in the final agent take all that raw information and spit out a nice report that's the usual type of
2:49:30
workflow for a parallel agent so whenever you want to focus on speed this is the agent workflow for you especially
2:49:36
when you need a lot of work to get done so let's look at a few quick examples of
2:49:42
what they recommend so in this case if you wanted to do a parallel agent that
2:49:47
you know let's imagine you just wanted to do a lot of work most basic example is just agent one does work agent two
2:49:52
does work agent three does work and they all create outputs now this is handy and helpful cuz you're going to get a lot
2:49:57
done really quickly but like I mentioned earlier most of the time you want to combine all of these results into
2:50:03
something that the final agent can look at and generate a super nice report that you can start to look at that's usually
2:50:09
what you want to do with parallel workflows so now you've seen a high-level overview of what the agents look like let's hop over to the code
2:50:16
example where this will make so much sense cuz it's actually super easy to use so let's hop over to the code so you can see all this in action okay so it's
2:50:22
now officially time for us to get our hands dirty working with parallel agents now in this example we're actually using
2:50:28
sequential agents and parallel agents so don't let it confuse you but I'm going to walk you through everything step by step okay so first off what we need to
2:50:36
do is look at our root agent and what I want to call out is our root agent has
2:50:42
two sub agents so what's happening is the first agent is a parallel agent this
2:50:47
parallel agent we import it just like we do with everything else parallel agents up here sequential agents regular agents
2:50:53
we all import it from the same place now but here's what's happening under the hood we are generating multiple agents
2:51:00
to go off and do work so the first agent is going to be the CPU agent so it's going to do work we have a memory agent
2:51:05
which goes off and looks at how much memory we have available on our computer and the final agent looks up how much hard drive space we have on our computer
2:51:12
and all of these agents are going to get wrapped in a sequential workflow that's
2:51:17
exactly what the system information gatherer parallel agent is doing so when you see this right here in your head you
2:51:23
should be thinking okay I have three agents running in parallel and they're just wrapped in one parallel agent great
2:51:31
now going back to our sequential agent you can see the second item that we have
2:51:36
is a system report synthesizer so what this is going to do is it's going to take all the information that these
2:51:42
agents are saving to state so they're all saving to state and this system report generator is going to then say
2:51:48
great I understand everything that you've done i'm going to put it in nice report so the like final result is you're going to have just a quick repeat
2:51:54
is you're going to have parallel workflow that's going to have three agents and then you're going to have one final agent that's going to work and all
2:52:02
of this is going to live inside of this sequential agent right here so sequential agent is running the parallel
2:52:08
agent first and it's going to pass their final results over to the system report synthesizer so hopefully that makes sense and hopefully you're starting to
2:52:14
see like oh wow I can start to chain together parallel agents within sequential agents like the world is your
2:52:19
oyster you can do whatever you want so what I'd like to do is first walk through what each one of these agents does at a high level because I think
2:52:25
it's pretty cool and then you'll see how we start to save each one of the results from these to state and then access all
2:52:31
the saved information and make a nice report so let's dive into the CPU agent first and when it comes to best
2:52:36
practices what you'll start to know as you build larger and larger agent workflows is within each agent to keep
2:52:43
things nice and tidy you'll first want to create your agent.py and then if there's any particular tools that you
2:52:49
want this agent to use you usually break them out into tools.py file to where eventually each folder is going to have
2:52:55
its own agent.py and its own tools.py so it just keeps things very very clean and it keeps your files very lightweight so
2:53:02
let's dive into looking at the CPU agent where basically what it's going to do is all it really is going to do is call the
2:53:09
get CPU data function and this is going to call the psutils library so this is a
2:53:16
library that we've already installed and what it's going to do is it's going to see how many CPUs you have and it's
2:53:21
going to put all this in a nice dictionary that we can return to our agent so you can see this this is a huge
2:53:28
bit of information we're going to return so we're going to turn the CPU stats we're going to return all the cores
2:53:33
we're going to return all sorts of information back to our agent and the most important thing is let's get out of tools all of that information that we
2:53:40
get from our tool call is going to get saved to CPU information great so now let's go look at our next agent which is
2:53:46
going to be the memory info agent now our memory info agent once again is going to have instructions for like hey
2:53:52
your job is to go get anything related to memory when it comes to the computer and you're going to report back usage if
2:53:58
you know if they're using a ton of memory and in our case we're going to have another tool once again going to
2:54:03
use the psutil library and we're just trying to put as much information in this tool call as we possibly can and
2:54:10
return it in a dictionary because that's what ADK likes it wants our tools to return dictionaries with as much
2:54:16
information as we possibly can for the agent to easily read through it per usual we're going to save the results to
2:54:21
an output key so that it gets saved to state and then finally what we're going to do is go over to our disk information
2:54:27
agent and what we're going to do with our disk information agent pretty much same thing that you've seen for everything else we're going to look at
2:54:32
what we have saved to our disk if we have too much information saved to our disc we're going to say "Hey it's high
2:54:38
usage." Then finally we're once again calling the PS utils library where we're
2:54:43
going to check and basically make a few requests to see what disk we have available and how much we are using for
2:54:49
each device we have on our computer so all in all pretty cool code and we're going to return all the information so
2:54:54
that's everything at a high level for all of our parallel agents that are going to go work separately because
2:55:00
there's no reason there's no reason for us to do agent one then wait a few minutes or a few seconds then call agent
2:55:07
two then call agent three afterwards like all of these can be done in parallel to save time so that's why
2:55:13
we're doing this and then finally once all of these agents have gone off and saved everything to state we're then
2:55:19
going to use the system report synthesizer to access all that saved information and make a nice report so
2:55:25
this is where you can start to see how everything comes together so you can say great you are here to generate a nice
2:55:30
report on my system here's all the raw information you need to know you have access to CPU information that's saved
2:55:36
to state you have access to memory and disk information that are also saved to state and I want you to make a well
2:55:43
formatted report is basically in markdown that you can then show to me so that's exactly what we're doing so let's
2:55:50
run this bad boy so you guys can see it in action so we need to go over to our example number 11 for parallel agents
2:55:56
and now we can run ADK web when we run ADK web it's going to kick off our
2:56:02
server and you can see it already shows us the root agent and just a quick reminder that root agent has a parallel
2:56:09
workflow for the first agent and then the second agent is going to be that system report this is all handled under
2:56:15
our a sequential agent that has a parallel agent and a regular one okay great so what we can say is say please
2:56:22
get the stats for my computer now what this will do is it will trigger all
2:56:27
sorts of states so we should start to see each one of these get triggered in parallel i mean that happens so fast it's it's it's hard to keep up see
2:56:32
that's the power of parallel but you can see at the same time we made requests to each tool where normally if we were to
2:56:41
not use parallel workflows it would have been okay step one call get CPU great I
2:56:46
got the answer now I'll move on to the next one great I got the answer cool now I'll go to the third one got the answer
2:56:52
so as you can see this was so much faster from there in real time we were getting back all of the information in a
2:56:59
nice little report so each agent was spitting out the results so you can see when I click Click on this agent you can
2:57:05
see the memory oh this is pretty cool i'll I'll zoom out so you guys can see it so you can see in our parallel workflow we have access to three
2:57:12
different agents and you can see when I click on each agent like it just so happened that agent two finished before
2:57:17
agent one because in in parallel workflows order is not guaranteed and it doesn't matter because it's all
2:57:22
happening in parallel but you can see this agent was able to report back how much memory I have available usage and
2:57:28
so forth the next I can see my CPU agent said "Hey your system has 10 cores you're using not a ton great and then
2:57:35
finally for my disc agent you can see I have like external hard drives and everything hooked up so everything looks
2:57:40
good and then finally when it comes to the final report you can see uh cuz these were all wrapped in a sequential
2:57:46
workflow so this one was step one and this one was step two so you can see step two looked at all of the state
2:57:52
information so I can actually scoot over here so you can see in example number two it was given access to I can
2:57:59
actually go in here and show you guys yeah so your job is to be a system report information and then right here
2:58:06
for CPU information we actually passed in all the information from report number one and then when it comes to
2:58:13
memory information we passed in everything from report number two so all this got passed in a prompt and then it
2:58:18
generated this super nice looking report for us so we can get a good understanding of what's going on in our computer and if we need to do anything
2:58:25
else and overall thank god my computer's in good condition i'd be hosed if it wasn't i wouldn't be upset if I got a
2:58:30
new computer though and uh yeah you can see everything is looking great so this is parallel agents in action and just
2:58:37
quick reminder you want to use parallel agents whenever you want to do a lot of work at the same time all right great so
2:58:44
now we are almost done guys we can now go to our final example which is loop agents which is going to be one of the
2:58:51
most powerful workflow tools available inside ADK so let's hop over to our final example example number 12 all
2:58:56
right give yourself a pat on the back cuz you've officially made it to the final example inside this ADK crash
 Example 12: Loop Agents
2:59:02
course and in example number 12 we're going to focus on adding in loop agents
2:59:09
workflows to our toolkit now what we're going to focus on in this one is you're going to see how you can begin to use
2:59:14
loop agents to have your agents iterate on a problem over and over and over again to solve a specific problem until
2:59:21
they get an answer this is one of the most powerful features in my opinion and it feels a lot like how crew AI in lane
2:59:27
chain will use agents in the react format which stands for reason and act where agents will continually think
2:59:34
about a problem and work on it over and over and over again until they get an answer so this is a super powerful pattern and in this example breakdown
2:59:41
we're first going to head over to the docs look at what ADK recommends then we're going to dive into the code and then we're going to run this bad boy so
2:59:47
let's hop over to the code so you can see everything you need to know okay so when it comes to loop agents the main
2:59:52
thing you need to know is loop agents are basically sequential agents but on
2:59:58
steroids and what I mean by that is loop agents will continually run until we've
3:00:03
run out of iterations so like hey only try to solve this problem five times so it'll run multiple times or until a
3:00:11
specific condition is met so we can say "Hey please continue to search the internet until you find five resources
3:00:17
that I can use for my report." So that's continually solving the problem over and over and over again until we meet one of
3:00:24
these criteria a max iterations or until we meet a specific condition that we specify so here's a quick example of
3:00:30
what ADK recommends so let's say you want to build an agent that can generate images of food but sometimes when you
3:00:36
generate a specific number of items like five banana it generates a different number of those items in the image so
3:00:42
because you have two tools in your agent you know option one could generate the
3:00:47
image and then option or sorry agent two could count the food and basically you would have those agents continue to go
3:00:53
and work over and over and over again until it generated an image that you
3:00:59
know had the right quantity so that's exactly what you would want to do when working with loop agents and they're
3:01:04
actually super super easy to use but there is a little bit of trickiness when it comes to exiting a loop so that's
3:01:11
exactly what we're going to cover now in the code so you can see all this in action so let's hop over to the code okay so it's now time to look at our
3:01:18
final code so in this example we are focusing on creating a loop agent and if
3:01:24
you remember the core things to know about loop agents is that they exit when one of two things happens first whenever
3:01:32
we hit max iterations or whenever we meet a certain condition that says we're
3:01:38
good we're done we don't want to work anymore and now it's time to quit and you'll see how we can do that in just a
3:01:44
second inside of our sub agents and the other thing the core reminder to note is
3:01:49
in our sub agents what happens is we always first do this one we always do
3:01:54
the first one first and then we always go to the second and we just continue the cycle over and over and over and over again so what we're also going to
3:02:01
do is inside of this agent is we actually have two parts to it so part
3:02:06
one is we are going to create an initial LinkedIn post and then part two is going to be the loop where the loop is exactly
3:02:13
what you just saw where we have one agent that reviews it and then we have one agent that actually implements the
3:02:19
changes so that's exactly what we have going on in here so if we were to draw this out step one is generate post and
3:02:26
then step two is we have our loop agents where our first agent is going to review
3:02:32
and the next one's going to refine and it's just going to go in a workflow just like this over and over and over again
3:02:39
until we get that beautiful LinkedIn post so let's start to look at each one of these step by step so you can see how
3:02:45
state is shared amongst all of these different agents from our sequential agents all the way to our loop agents so
3:02:51
let's hop into our initial post generator so you can see exactly what it's doing so in this case we're saying
3:02:57
all right you are a LinkedIn post generator and what I would like you to do is to create a LinkedIn post about
3:03:04
agent development kit uh from the tutorial that I'm creating for you guys so this is uh hey if you want to take a
3:03:10
moment to share the post that we're going to create mean the world to me and also like and subscribe all the goodness
3:03:15
and here are the requirements for this post you need to talk about how you are excited here's everything that we
3:03:21
covered in this tutorial so that there are you know the agent knows exactly what we've worked on together we're also
3:03:27
saying here's the style requirements no emojis no hashtags and then finally what
3:03:32
I want you to do is only return the post don't do any additional commentary and don't do any formatting markers just
3:03:38
give me the post nothing else and per usual because we want to save the output of this agent to state so that the next
3:03:45
agents can use it and that's where we're going to use our output key once again to save it to state under current post
3:03:51
great so now let's look at uh the agents with inside of our loop agent so our
3:03:56
loop agent the first one that we always are going to do and trigger is going to be the post reviewer so the post
3:04:02
reviewer let's walk through these instructions carefully first things first we specified that the post we're
3:04:09
generating needs to be within a,00 to 1500 characters so you need to use the
3:04:15
character count tool to make sure and check the post length if it's too big too small we need to do another
3:04:20
iteration so this is where we're just giving instructions on what to do if the length is too big or too small from
3:04:26
there if the length is correct we then want to make sure that our post meets all of these criteria so you want to say
3:04:33
it mentions my name it has a clear call to action shows genuine excitement and once again we want to make sure that all
3:04:40
of these different style requirements are met if any of them don't pass we need to say "Hey something went wrong."
3:04:45
And if something does go wrong for any specific reason you need to return a concise instructions on what went wrong
3:04:53
and then for whatever reason if all of the requirements are met if things go well I want you to call the exit loop
3:05:00
function and this exit loop function is the special case where we can actually
3:05:05
have our agent break out of the loop so what I want to do first is look at how we're going to count characters then
3:05:12
we're going to look at the exit loop so you can see how you can actually have your agents quit the loop and then the only other thing I was going to mention
3:05:18
is obviously in order for us to review the agent we need to access our current post in state okay so let's go look at
3:05:24
our character count tool first and as I mentioned a while ago as you begin to build bigger and bigger agents you want
3:05:31
to start to save your tools next to your agents in one nice tidy folder so let's look at this so in this case we're
3:05:38
saying all right when it comes to the count character tool I want you to give me the text and I want the tool context
3:05:45
when it comes to you know looking at if the post is too big we're first just
3:05:51
going to call length this is a built-in Python function and we're going to look at the length of the entire post if the
3:05:58
length is too short we're going to return a result saying "Hey I sorry
3:06:03
we're going to say I failed." And the reason why is because my character count is too tiny here's the current one i
3:06:10
need you add in an additional 20 characters and then we're going to have a nice little message that puts it all together where it says "Hey post is too
3:06:17
short add this many characters the minimum length is this." So we're just reminding the agent what it needs to do
3:06:22
if it was too big what we're going to do is say "Hey you know you need to the post is too long remove this many
3:06:29
characters here's the max length." So that's all this tool does and outside of that we're just updating the review
3:06:35
status to fail if any of these requirements aren't validated finally if the post is not too big or too small
3:06:41
we're going to say everything was a pass and we're going to have this tool return a a message that says "Yep everything
3:06:48
passed here's the character count and everything looked great." So that's what the character count tool is going to do
3:06:55
now we get to dive into the exit loop functionality and this is where you are going to have your agents say "Life's
3:07:02
good i'm happy with the result." Quit iterating and going over and over in the loop so this is exactly what you need to
3:07:08
do all you have to do is accessing the tool context that you can pass into your
3:07:14
tool calls you are going to say tool context actions escalate and escalate
3:07:19
all it does is it exits the current loop super simple to use and then you just return none that's all you got to do all
3:07:25
right great so now that you've seen how we can review a post let's look at what happens if there is feedback so we're
3:07:31
now going to go over to the post refiner agent who's responsible for taking in the input and acting on it so we're
3:07:38
going to say all right you are the LinkedIn post refiner your job is to refine the LinkedIn post based on
3:07:44
feedback I give you here's the current post saved to state and what I want you to do is look at the feedback that I've
3:07:52
given you from the previous agent because if you remember everything's getting saved to review feedback so
3:07:58
that's what we're accessing right here now what we're saying when it comes to the actual task for this you know hey
3:08:03
please apply the feedback appropriately to improve the post you know don't get wild don't change everything keep it as
3:08:09
you know similar as possible here's the requirements one more time as you're making the feedback changes and then go
3:08:15
from there and the job is once it's done so here's like where the loop happens it's going to save the changes it makes
3:08:22
to current post so what's happening is like first what's happening is like we generate the post from there we are
3:08:28
reviewing the post and then refining it and then I don't know why it's dropping away like that but once we refine the
3:08:34
post we're saving the results back to current post so that when we go to review it again we know exactly where to
3:08:40
look okay great hopefully this makes sense so now that we've seen it all in the instructions let's run this bad boy
3:08:46
so you can see it in action so let's clear everything out we're going to make sure we change directories over to the
3:08:53
proper folder so you need to be in the final example and you need to make sure our environment is activated and now we
3:08:59
can run it so we can just type in adk web and this will generate a post for us or sorry this will open up the browser
3:09:06
so that we can generate a post so I'm going to say please generate a post
3:09:12
saying that this was the best ADK tutorial I've ever watched
3:09:19
now what this is going to do let's make this a little bit bigger for you guys now we're going to generate this from
3:09:25
there what we would expect to see is our initial postgenerator agent go off and run and
3:09:31
this is where it will make a initial rough draft of saying "Hey AI with Brandon did an awesome job i learned a
3:09:38
ton." But you can see I'm going to let it run cuz it's it's doing its loop thing yeah okay so now we can start to
3:09:43
look at it so you can see it took its first attempt it did a pretty good job like this is a really nice looking rough
3:09:49
draft then we had our second agent start to go through and count characters so
3:09:55
you can see at this point what's happening is we're at this step so the initial post generator sorry yeah the
3:10:01
initial post generator already ran right here and now we are already in post
3:10:06
refinement specifically we are looking at the post reviewer and the post reviewer always counts characters and we
3:10:13
can see oh it looks like this post is too short you need to add more details to meet the minimum length from there
3:10:20
the refiner agent takes in all the information and generates a much longer post except this time it went way too
3:10:27
hard so you can now see in the count character tool you know hey this post is way too long you need to remove like
3:10:33
almost half the characters this is crazy so then it does it again where this time it does a pretty much a lot better job
3:10:40
and this time you can see it counted the characters things are looking great now we are in a state to where this post now
3:10:49
basically this post reviewer so this is the output from post reviewer it says this post mentions Brandon it talks
3:10:55
about everything it needed to and then because everything looked good we can now exit the loop so we should be able
3:11:01
to see our final state in here so if we go to state this is the final output of
3:11:08
our agent where this post has all the core requirements where it's not too long it's not too short and everything
3:11:15
looks great so you can see yep this is so excited it talks about everything you know I've been brainstorming yeah
3:11:22
everything about this post is just like what you would need to do because it meets all our criteria so yeah that is
3:11:27
our loop agents in a nutshell and just a core quick core reminder the way it worked so you remember the core lessons
3:11:34
is loop agents will continually work until one of two things happens first it
3:11:39
will exit if we iterate too many times and it'll say "Hey I was unable to get you the answer you wanted." Or option
3:11:45
two is when the agent it does everything it was supposed to and we call exit loop
3:11:51
where all we do is escalate to say escalate true and we'll break out of the loop but yeah you guys are now
3:11:56
officially experts at working with all sorts of the different workflows and everything else when it comes to
3:12:02
creating ADK agents and just a few quick reminders you can download all the source code that you saw today
 Outro
3:12:07
completely for free just click the link down the description below also if you have any questions you can either drop a
3:12:13
comment down below or you can head over to the free school community I created for AI developers just like you where
3:12:18
you can hop on our weekly free coaching calls and get direct feedback from me so we can get you unstuck and moving
3:12:23
forward but that's for this video guys today and I have a ton of other AI related content on this channel and a
3:12:29
bunch more tutorials coming out for more ADK content definitely recommend checking out all the other videos I have
3:12:35
and whichever videos are popping up right now on the screen but until the next one can't wait to see you guys have a good one bye