import useAsync from './hooks/useAsync';
import {
  IfFulfilled,
  IfPending,
  IfRejected
} from './components/other/AsyncComponents';
import ScreenContainer from './components/containers/ScreenContainer';
import MealPlanInfo from './components/sections/MealPlanInfo';
import { useState, useEffect, useMemo, useRef } from 'react';
import Meal from './types/Meal';
import MealReference from './types/MealReference';
import DayEditor from './components/sections/DayEditor';
import MealQueue from './components/sections/MealQueue';
import Results from './components/sections/Results';
import ResultsBar from './components/sections/ResultsBar';
import {
  UserSelectedMealsObject,
  UserSelectedMealsObjectType
} from './types/userSelectedMealsObject';
import usePersistentState from './hooks/usePersistentState';
import { getMeals } from './static/mealsDatabase';
import { getMealTotal, calculateDateWhenRunOut } from './lib/calculationEngine';
import { getWeekdaysBetween } from './lib/dateCalcuation';
import Tutorial from './components/modals/Tutorial';
import tutorialSteps from './static/tutorialSteps';
import AvailableMeals from './components/sections/AvailableMeals';
import Menu from './components/other/Menu';
import WhatsNewModal from './components/modals/WhatsNewModal';
import ContextProvider from './components/other/ContextProvider';

function App() {
  /**
   * Fetch meals
   */
  const mealsState = useAsync<Meal[]>(getMeals);

  /**
   * Stores the list of available meals
   */
  const meals = useMemo(() => mealsState.data as Meal[], [mealsState.data]);

  /**
   * Stores the error state of the meal database
   */
  const error = useMemo(() => mealsState.error, [mealsState.error]);

  /**
   * Stores the user's chosen number of weeks off
   */
  const [weeksOff, setWeeksOff] = usePersistentState<number | null>(
    'weeksOff',
    null
  );

  /**
   * Stores the user's chosen meal plan (discount or not)
   */
  const [mealPlan, setMealPlan] = usePersistentState<boolean | null>(
    'isDD',
    false
  );

  /**
   * Stores the user's starting balance
   */
  const [balance, setBalance] = usePersistentState<number | null>(
    'startingBalance',
    null
  );

  /**
   * Stores the user's chosen start date
   */
  const [startDate, setStartDate] = usePersistentState<Date | null>(
    'startDate',
    null,
    (str) => new Date(str)
  );

  /**
   * Stores the user's chosen end date
   */
  const [endDate, setEndDate] = usePersistentState<Date | null>(
    'endDate',
    null,
    (str) => new Date(str)
  );

  /**
   * Stores the user's selected meals
   */
  const [userSelectedMeals, setUserSelectedMeals] = usePersistentState(
    'userSelectedMeals',
    new UserSelectedMealsObject()
  );

  /**
   * Stores the user's meal queue
   */
  const [mealQueue, setMealQueue] = usePersistentState<Array<MealReference>>(
    'mealQueue',
    []
  );

  /**
   * Stores all custom meals the user has created
   */
  const [customMeals, setCustomMeals] = usePersistentState<Array<Meal>>(
    'customMeals',
    []
  );

  /**
   * Stores all meal locations
   */
  const [mealLocations, setMealLocations] = useState<string[]>([]);

  /**
   * An array of refs to the tutorial divs
   */
  const tutorialDivs = useRef<(HTMLElement | null)[]>(
    Array(tutorialSteps.length).fill(null)
  );

  /**
   *
   * @param ref - The ref to add
   * @param title - The title of the step
   */
  const addRef = (ref: HTMLElement | null, title: string) => {
    if (ref === null) return;
    const index = tutorialSteps.findIndex((step) => step.title === title);
    if (index === -1)
      throw new Error(`Title ${title} is not part of the tutorial`);
    tutorialDivs.current[index] = ref;
  };

  /**
   * Tracks whether the tutorial should be shown
   */
  const [showTutorial, setShowTutorial] = useState(false);

  /**
   * The current step of the tutorial
   */
  const [tutorialStep, setTutorialStep] = useState(0);

  /**
   * Tracks whether all details have been entered to the meal plan info form
   */
  const [areDetailsEntered, setAreDetailsEntered] = useState(false);

  /**
   * Load meal locations from api
   */
  useEffect(() => {
    if (meals)
      setMealLocations(Array.from(new Set(meals.map((m) => m.location))));
  }, [meals]);

  /**
   * Remove dangling meal references from mealQueue
   */
  useEffect(() => {
    if (meals) {
      const newMealQueue = mealQueue.filter((mr) =>
        [...meals, ...customMeals].find((m) => m.id === mr.id)
      );
      if (newMealQueue.length !== mealQueue.length) {
        setMealQueue(newMealQueue);
      }
    }
  }, [mealQueue, customMeals, setMealQueue, meals]);

  /**
   * Remove dangling meal references from userSelectedMeals
   */
  useEffect(() => {
    if (meals) {
      const newUserSelectedMeals = Object.fromEntries(
        Object.entries(userSelectedMeals).map(([key, value]) => [
          key,
          value.filter((mr: MealReference) =>
            [...meals, ...customMeals].find((m) => m.id === mr.id)
          )
        ])
      ) as UserSelectedMealsObjectType;
      if (
        Object.keys(newUserSelectedMeals).length !==
        Object.keys(userSelectedMeals).length
      ) {
        setUserSelectedMeals(newUserSelectedMeals);
      }
    }
  }, [userSelectedMeals, customMeals, setUserSelectedMeals, meals]);

  /**
   * The grand total cost of all the meals from the start date to the end date.
   */
  const grandTotal = useMemo(
    () =>
      meals
        ? startDate !== null &&
          endDate !== null &&
          balance !== null &&
          weeksOff !== null
          ? getMealTotal(
              userSelectedMeals,
              getWeekdaysBetween(startDate, endDate, weeksOff),
              mealPlan ?? false,
              [...meals, ...customMeals]
            )
          : 0
        : 0,
    [
      balance,
      customMeals,
      endDate,
      mealPlan,
      startDate,
      userSelectedMeals,
      weeksOff,
      meals
    ]
  );

  /**
   * Indicates whether the grand total is under the inital balance.
   */
  const isUnderBalance = useMemo(
    () => (balance !== null ? balance >= grandTotal : false),
    [balance, grandTotal]
  );

  /**
   * The difference between the balance and the grand total.
   */
  const difference = useMemo(
    () =>
      balance !== null && grandTotal !== null
        ? Math.abs(balance - grandTotal)
        : 0,
    [balance, grandTotal]
  );

  /**
   * The date when the user will run out of money, if they take their breaks before this date.
   */
  const dayWhenRunOut = useMemo(
    () =>
      meals
        ? calculateDateWhenRunOut(
            userSelectedMeals,
            mealPlan ?? false,
            [...meals, ...customMeals],
            startDate ?? new Date(),
            endDate ?? new Date(),
            balance ?? 0,
            weeksOff ?? 0
          )
        : null,
    [
      userSelectedMeals,
      mealPlan,
      customMeals,
      startDate,
      endDate,
      balance,
      weeksOff,
      meals
    ]
  );

  return (
    <ContextProvider
      meals={meals}
      mealLocations={mealLocations}
      setMealLocations={setMealLocations}
      setShowTutorial={setShowTutorial}
      setTutorialStep={setTutorialStep}
      tutorialDivs={tutorialDivs}
      addRef={addRef}
      weeksOff={weeksOff}
      setWeeksOff={setWeeksOff}
      mealPlan={mealPlan}
      setMealPlan={setMealPlan}
      balance={balance}
      setBalance={setBalance}
      startDate={startDate}
      setStartDate={setStartDate}
      endDate={endDate}
      setEndDate={setEndDate}
      userSelectedMeals={userSelectedMeals}
      setUserSelectedMeals={setUserSelectedMeals}
      mealQueue={mealQueue}
      setMealQueue={setMealQueue}
      customMeals={customMeals}
      setCustomMeals={setCustomMeals}
    >
      <IfFulfilled state={mealsState}>
        <Menu />
      </IfFulfilled>
      <ScreenContainer>
        <WhatsNewModal />
        <header className='bg-messiah-blue rounded-xl border-4 border-white shadow-md w-full mb-4 flex flex-row justify-center items-center gap-4'>
          <h1 className='font-semibold text-4xl text-white text-center py-8'>
            Messiah Meal Planner
          </h1>
        </header>
        <div className='flex flex-col relative gap-4'>
          <Tutorial
            show={showTutorial}
            setShow={setShowTutorial}
            step={tutorialStep}
            setStep={setTutorialStep}
            areDetailsEntered={areDetailsEntered}
          />
          <MealPlanInfo onEnterDetails={setAreDetailsEntered} order={1} />
          {areDetailsEntered ? (
            <>
              <IfRejected state={mealsState}>
                <div className='flex flex-col items-center order-1'>
                  <p className='text-red-500'>
                    Something went wrong: {error?.message}
                  </p>
                </div>
              </IfRejected>
              <IfPending state={mealsState}>
                <div className='flex flex-col items-center order-1'>
                  <p className='text-gray-400'>Loading Menu...</p>
                </div>
              </IfPending>
              <IfFulfilled state={mealsState}>
                <>
                  <AvailableMeals order={2} />
                  <MealQueue order={3} />
                  <DayEditor order={4} />
                  <Results
                    order={5}
                    dataIsInvalid={Object.values(userSelectedMeals).some(
                      (meals) => meals.some((meal: Meal) => meal?.legacy)
                    )}
                    grandTotal={grandTotal}
                    isUnderBalance={isUnderBalance}
                    difference={difference}
                    dayWhenRunOut={dayWhenRunOut}
                  />
                  <ResultsBar
                    order={6}
                    grandTotal={grandTotal}
                    isUnderBalance={isUnderBalance}
                    difference={difference}
                  />
                </>
              </IfFulfilled>
            </>
          ) : (
            <div className='flex flex-col items-center order-1'>
              <p className='text-gray-400'>
                Enter meal plan info to continue planning.
              </p>
            </div>
          )}
        </div>
      </ScreenContainer>
    </ContextProvider>
  );
}

export default App;
