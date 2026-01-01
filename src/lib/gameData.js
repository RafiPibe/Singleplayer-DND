import { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase.js';
import { CLASSES, CUSTOM_CLASS, HP_RANGE, REPUTATION } from '../data/classes.js';
import { ABILITIES, SKILLS, SKILLS_BY_ABILITY } from '../data/abilities.js';
import { RACES } from '../data/races.js';

const FALLBACK = {
  abilities: ABILITIES,
  skillsByAbility: SKILLS_BY_ABILITY,
  skills: SKILLS,
  races: RACES,
  classes: CLASSES,
};

const coerceArray = (value, fallback) => (Array.isArray(value) ? value : fallback);
const coerceObject = (value, fallback) =>
  value && typeof value === 'object' && !Array.isArray(value) ? value : fallback;

export const useGameData = () => {
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState('');
  const [data, setData] = useState({});

  useEffect(() => {
    let ignore = false;
    if (!supabase) {
      setLoading(false);
      return undefined;
    }

    const load = async () => {
      setLoading(true);
      setError('');
      const { data: rows, error: fetchError } = await supabase
        .from('game_data')
      .select('key,value')
      .in('key', ['classes', 'races', 'abilities', 'skills_by_ability']);

      if (ignore) return;

      if (fetchError) {
        setError(fetchError.message);
        setData({});
      } else {
        const next = {};
        (rows ?? []).forEach((row) => {
          next[row.key] = row.value;
        });
        setData(next);
      }
      setLoading(false);
    };

    load();

    return () => {
      ignore = true;
    };
  }, []);

  const abilities = useMemo(
    () => coerceArray(data.abilities, FALLBACK.abilities),
    [data.abilities]
  );
  const skillsByAbility = useMemo(
    () => coerceObject(data.skills_by_ability, FALLBACK.skillsByAbility),
    [data.skills_by_ability]
  );
  const skills = useMemo(() => {
    if (Array.isArray(data.skills)) return data.skills;
    const derived = Object.values(skillsByAbility).flat();
    return derived.length ? derived : FALLBACK.skills;
  }, [data.skills, skillsByAbility]);
  const races = useMemo(() => coerceArray(data.races, FALLBACK.races), [data.races]);
  const classes = useMemo(() => coerceArray(data.classes, FALLBACK.classes), [data.classes]);
  return {
    loading,
    error,
    abilities,
    skills,
    skillsByAbility,
    races,
    classes,
    customClass: CUSTOM_CLASS,
    reputation: REPUTATION,
    hpRange: HP_RANGE,
  };
};
