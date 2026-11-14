// Original, general-purpose guidance. Never embed publisher option lists,
// mechanical bonuses, stat blocks, or extracted text in the public bundle.
export const CHARACTER_GUIDANCE = Object.freeze({
  species:{
    question:'Who are you?',
    explanation:'Your species is one part of your character’s background. Choose a species available in your own book, then apply the attribute adjustments shown for that choice.',
    next:'Find your species in the PDF, read its description, and copy the adjustment values into the fields below.',
    terms:[['Attributes','Broad capabilities such as Control, Fitness, and Reason. Higher values help related tasks.']]
  },
  environment:{
    question:'Where did you grow up?',
    explanation:'Your early environment helps explain the influences that shaped your character before Starfleet.',
    next:'Choose one environment from your book, assign its bonuses, and write a Value that reflects that upbringing.',
    terms:[['Value','A belief or principle that guides your character’s decisions and can matter during play.']]
  },
  outlook:{
    question:'What shaped your outlook?',
    explanation:'Your early experiences help explain how you approach problems and what subjects you know especially well.',
    next:'Choose the relevant option from your book and apply its attribute, discipline and Focus adjustments.',
    terms:[['Focus','A specific area of expertise. Unlike a general attribute, it describes something your character is particularly good at.']]
  },
  education:{
    question:'What did you learn?',
    explanation:'Education develops your professional strengths and the subjects in which you have special expertise.',
    next:'Use the education option in your own book. Assign only the prescribed bonuses, then enter your three Focuses.',
    terms:[['Discipline','A professional field such as Science, Engineering, or Command. It combines with an attribute in task resolution.']]
  },
  career:{
    question:'How long have you served?',
    explanation:'Your career history changes the kind of experience you bring to a mission and informs another personal Value.',
    next:'Choose the career length listed in your book and add the Value you develop from that choice.',
    terms:[['Career length','A roleplaying choice about professional experience, not your actual age.']]
  },
  event1:{
    question:'What happened during your career?',
    explanation:'A career event is a formative experience your character carries into the present.',
    next:'Choose your first event from the book and record its bonuses and related expertise.',
    terms:[['Career event','A past incident used to define your character, not a mission you must play through now.']]
  },
  event2:{
    question:'What else changed your path?',
    explanation:'A second event adds complexity and may explain a different skill or point of view.',
    next:'Choose a different or appropriate second event using your book’s rules; apply only the listed adjustments.',
    terms:[['Career event','A past experience that helps explain who your character is today.']]
  },
  finishing:{
    question:'Who is your character now?',
    explanation:'This final stage brings your earlier choices together before they are applied to the active character sheet.',
    next:'Finish your remaining points, review the totals, and apply the result. Your work remains a draft until you do.',
    terms:[['Review','Check that the points and written choices match your book; validation checks arithmetic but does not substitute for your book.']]
  }
});
export const SHIP_GUIDANCE = Object.freeze([
  {question:'What are you commanding?',explanation:'Decide whether the campaign follows a moving starship or a station, and the era in which it operates.',next:'Choose the kind of home and write its era.'},
  {question:'Which class does it belong to?',explanation:'The class determines what capabilities and departments your ship or station has.',next:'Select a class already verified from your book, or copy the published ratings from your own PDF. Do not invent numbers.'},
  {question:'Who does it represent?',explanation:'A polity trait expresses the institution or culture this vessel belongs to.',next:'Choose a trait permitted by your book.'},
  {question:'What makes it distinctive?',explanation:'A unique trait is a characteristic you can draw on when describing what this vessel does well—or what complicates its missions.',next:'Add a trait that fits the vessel; leave it blank if optional.'},
  {question:'What can it do especially well?',explanation:'Talents describe special capabilities beyond its general systems and departments.',next:'Enter permitted talents from your own rulebook, one per line.'},
  {question:'What is its identity?',explanation:'Finish with the name and registry that the crew will use in play.',next:'Name your ship or station, then review and apply the completed build.'}
]);
export const MISSION_GUIDANCE = Object.freeze({
  heading:'Start with a situation, not an empty screenplay',
  introduction:'You write the story. Begin with a problem the crew must solve, then discover what happens through scenes and task rolls.',
  prompts:[
    'What has just happened that the crew cannot ignore?',
    'Who needs the crew’s help, or what is at risk?',
    'What is the first thing your character can investigate or do?'
  ],
  firstScene:'After naming the mission, open Act One and describe the first immediate problem. Use a task roll only when an uncertain action needs resolution.'
});
export function guidanceForCharacterStep(id){
  const guidance=CHARACTER_GUIDANCE[id];
  if(!guidance)throw new Error('Unknown character creation step.');
  return guidance;
}
export function shipGuidanceAt(index){
  if(!Number.isInteger(index)||index<0||index>=SHIP_GUIDANCE.length)
    throw new Error('Unknown ship creation step.');
  return SHIP_GUIDANCE[index];
}
